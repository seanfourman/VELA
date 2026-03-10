# Backend DI and Repository Refactor Plan

## Status
Completed.

The backend now follows this structure across all active slices:
- controller -> injected service -> injected repository -> injected SQL connection factory

Implemented slices:
- users/auth/profile
- favorites
- recommendations
- star-party events

Implemented shared infrastructure:
- `ISqlConnectionFactory` / `SqlConnectionFactory`
- `ITokenService` / `JwtTokenService`
- repository interfaces for each feature slice
- service interfaces for each feature slice
- removal of the old static BL path and `DBService`

## Current structure
### Controllers
- HTTP concerns only
- validation and authorization handling
- delegate feature work to injected services

### Application services
- request normalization
- business rules
- ID generation
- password hashing and verification
- orchestration across repositories and token creation

### Repositories
- stored-procedure execution
- SQL parameter construction
- data-reader mapping
- output-parameter handling

### Shared infrastructure
- SQL connection creation via DI
- JWT token creation via DI

## Implemented interfaces
### Repositories
- `IUserRepository`
- `IFavoriteRepository`
- `IRecommendationRepository`
- `IStarPartyEventRepository`

### Services
- `IUserService`
- `IFavoriteService`
- `IRecommendationService`
- `IStarPartyEventService`
- `ITokenService`
- `ISqlConnectionFactory`

## Registrations
The service collection now registers:
- `ISqlConnectionFactory -> SqlConnectionFactory`
- `IUserRepository -> SqlUserRepository`
- `IFavoriteRepository -> SqlFavoriteRepository`
- `IRecommendationRepository -> SqlRecommendationRepository`
- `IStarPartyEventRepository -> SqlStarPartyEventRepository`
- `IUserService -> UserService`
- `IFavoriteService -> FavoriteService`
- `IRecommendationService -> RecommendationService`
- `IStarPartyEventService -> StarPartyEventService`
- `ITokenService -> JwtTokenService`

## What was removed
- static BL entry points for users, favorites, recommendations, and star-party events
- direct DAL construction with `new`
- `DBService` and its internal configuration-building connection logic
- direct JWT creation from the controller path

## Definition of done achieved
A feature slice is considered complete when:
- the controller depends on an interface
- the service depends on repository interfaces only
- the repository contains the SQL and stored-procedure calls
- no `new SomeDalService()` calls remain in the slice

The backend now meets that definition structurally.

## Immediate next implementation step
Add backend tests for the new service and repository seams so the architectural refactor is protected by automated verification.
