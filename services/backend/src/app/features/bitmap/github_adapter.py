from app.features.bitmap.bitmap_models import GithubProfile
from app.features.bitmap.github_schemas import GithubRead


def github_profile_to_read(profile: GithubProfile) -> GithubRead:
    return GithubRead.model_validate(profile)
