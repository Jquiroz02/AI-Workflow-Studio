async def test_get_current_user_profile(client, test_user):
    resp = await client.get("/api/v1/me")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(test_user.id)
    assert body["email"] == test_user.email


async def test_get_me_requires_authentication(unauthenticated_client):
    resp = await unauthenticated_client.get("/api/v1/me")
    assert resp.status_code == 401
