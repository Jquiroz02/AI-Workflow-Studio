from httpx import ASGITransport, AsyncClient

from app.api.deps import get_current_user
from app.core.db import get_db
from app.main import app
from app.models.user import User


async def test_requires_authentication(unauthenticated_client):
    resp = await unauthenticated_client.get("/api/v1/projects")
    assert resp.status_code == 401


async def test_create_and_list_project(client):
    create_resp = await client.post(
        "/api/v1/projects", json={"name": "My Project", "description": "desc"}
    )
    assert create_resp.status_code == 201
    assert create_resp.json()["name"] == "My Project"

    list_resp = await client.get("/api/v1/projects")
    assert list_resp.status_code == 200
    projects = list_resp.json()
    assert len(projects) == 1
    assert projects[0]["document_count"] == 0
    assert projects[0]["conversation_count"] == 0


async def test_create_project_requires_name(client):
    resp = await client.post("/api/v1/projects", json={"name": ""})
    assert resp.status_code == 422


async def test_get_project_404_for_unknown_id(client):
    resp = await client.get("/api/v1/projects/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


async def test_update_project(client):
    create_resp = await client.post("/api/v1/projects", json={"name": "Old Name"})
    project_id = create_resp.json()["id"]

    update_resp = await client.patch(f"/api/v1/projects/{project_id}", json={"name": "New Name"})
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "New Name"


async def test_update_project_rejects_explicit_null_name(client):
    """Project.name is NOT NULL; `{"name": null}` must be rejected as a 422,
    not pass validation and crash as a raw 500 on the DB constraint."""
    create_resp = await client.post("/api/v1/projects", json={"name": "Keep me"})
    project_id = create_resp.json()["id"]

    update_resp = await client.patch(f"/api/v1/projects/{project_id}", json={"name": None})
    assert update_resp.status_code == 422

    get_resp = await client.get(f"/api/v1/projects/{project_id}")
    assert get_resp.json()["name"] == "Keep me"


async def test_update_project_can_explicitly_clear_description(client):
    create_resp = await client.post(
        "/api/v1/projects", json={"name": "Has description", "description": "will be cleared"}
    )
    project_id = create_resp.json()["id"]

    update_resp = await client.patch(f"/api/v1/projects/{project_id}", json={"description": None})
    assert update_resp.status_code == 200
    assert update_resp.json()["description"] is None

    # Name must be untouched by a PATCH that only mentions description.
    assert update_resp.json()["name"] == "Has description"


async def test_delete_project(client):
    create_resp = await client.post("/api/v1/projects", json={"name": "Temp"})
    project_id = create_resp.json()["id"]

    delete_resp = await client.delete(f"/api/v1/projects/{project_id}")
    assert delete_resp.status_code == 204

    get_resp = await client.get(f"/api/v1/projects/{project_id}")
    assert get_resp.status_code == 404


async def test_delete_project_removes_uploaded_files_from_disk(client, project):
    from app.services import storage_service

    relative_path = storage_service.save_file(project.id, "notes.txt", b"some file content")
    saved_path = storage_service._upload_root() / relative_path
    assert saved_path.exists()

    delete_resp = await client.delete(f"/api/v1/projects/{project.id}")
    assert delete_resp.status_code == 204

    assert not saved_path.exists()
    assert not saved_path.parent.exists()


async def test_project_ownership_is_isolated_between_users(db_session, project):
    other_user = User(clerk_user_id="other_clerk_user", email="other@example.com")
    db_session.add(other_user)
    await db_session.commit()
    await db_session.refresh(other_user)

    async def _override_get_db():
        yield db_session

    async def _override_get_current_user():
        return other_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_get_current_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get(f"/api/v1/projects/{project.id}")
            assert resp.status_code == 404

            list_resp = await ac.get("/api/v1/projects")
            assert list_resp.json() == []
    finally:
        app.dependency_overrides.clear()
