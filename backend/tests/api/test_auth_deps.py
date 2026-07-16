from app.api.deps import get_current_user
from app.core.db import AsyncSessionLocal
from app.core.security import TokenPayload
from app.models.user import User


class _FakeCredentials:
    credentials = "fake-token"


async def test_get_current_user_creates_new_user(db_session, monkeypatch):
    monkeypatch.setattr(
        "app.api.deps.verify_clerk_token",
        lambda token: TokenPayload(clerk_user_id="new-clerk-user", email="new@example.com"),
    )

    user = await get_current_user(credentials=_FakeCredentials(), db=db_session)

    assert user.clerk_user_id == "new-clerk-user"
    assert user.email == "new@example.com"


async def test_get_current_user_recovers_from_concurrent_creation_race(db_session, monkeypatch):
    """Two requests racing to JIT-provision the same brand-new Clerk user
    (e.g. two browser tabs signing in at once) must not surface a raw
    IntegrityError - the loser should just read back the winner's row."""
    monkeypatch.setattr(
        "app.api.deps.verify_clerk_token",
        lambda token: TokenPayload(clerk_user_id="racey-user", email="racey@example.com"),
    )

    # Simulate a concurrent request that already committed this user via a
    # separate connection, i.e. the state on the wire by the time our own
    # INSERT lands.
    async with AsyncSessionLocal() as other_session:
        other_session.add(User(clerk_user_id="racey-user", email="racey@example.com"))
        await other_session.commit()

    # Force get_current_user's own "does this user exist yet" SELECT to
    # still report "not found" (as it would have, had both requests' SELECTs
    # run before either INSERT), so it attempts to INSERT and collides for
    # real against Postgres - exercising the IntegrityError recovery path,
    # not a mocked exception.
    original_execute = db_session.execute
    call_count = 0

    async def _first_select_misses_then_normal(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:

            class _EmptyResult:
                def scalar_one_or_none(self):
                    return None

            return _EmptyResult()
        return await original_execute(*args, **kwargs)

    monkeypatch.setattr(db_session, "execute", _first_select_misses_then_normal)

    user = await get_current_user(credentials=_FakeCredentials(), db=db_session)

    assert user.clerk_user_id == "racey-user"
    assert user.email == "racey@example.com"
