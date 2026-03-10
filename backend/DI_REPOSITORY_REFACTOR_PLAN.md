# Backend DI and Repository Refactor Plan

## Why this needs to change
The current backend works, but it does not follow the dependency-injection and repository structure shown in the lecturer's Web API material.

Current issues in `backend/src/Vela.Api`:
- BL classes construct DAL classes directly with `new`.
- Controllers call static BL methods instead of injected application services.
- `DBService` rebuilds configuration and opens SQL connections itself.
- JWT creation is still configuration-driven inside the controller path instead of behind an injected token service.

This makes the code harder to test, harder to swap implementations, and less aligned with the course architecture.

## Current coupling points
### BL -> DAL direct construction
- `backend/src/Vela.Api/BL/User.cs`
- `backend/src/Vela.Api/BL/FavoriteSpot.cs`
- `backend/src/Vela.Api/BL/Recommendation.cs`
- `backend/src/Vela.Api/BL/StarPartyEvent.cs`

### DAL base class building config directly
- `backend/src/Vela.Api/DAL/DBService.cs`

### Controllers calling static BL methods
- `backend/src/Vela.Api/Controllers/UsersController.cs`
- `backend/src/Vela.Api/Controllers/FavoritesController.cs`
- `backend/src/Vela.Api/Controllers/RecommendationsController.cs`
- `backend/src/Vela.Api/Controllers/StarPartyEventsController.cs`

### DI registration currently missing domain services/repositories
- `backend/src/Vela.Api/Configuration/ServiceCollectionExtensions.cs`
- `backend/src/Vela.Api/Program.cs`

## Target structure
Use this shape for each feature:
- Controller: HTTP concerns only.
- Application service: validation orchestration, normalization, business flow.
- Repository interface: persistence contract.
- SQL repository: stored-procedure and ADO.NET implementation.
- Shared infrastructure: connection factory, options, token service.

Suggested namespaces and folders:
- `Application/Interfaces`
- `Application/Services`
- `Domain/Models` or keep `BL` temporarily during migration
- `Infrastructure/Data`
- `Infrastructure/Auth`

## Recommended interfaces
Start with the features already exposed by controllers.

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

## Migration order
Refactor one vertical slice at a time. Do not convert the entire backend in one pass.

### Phase 1: Infrastructure foundation
1. Add a typed options class for the DB connection string or read it directly from injected `IConfiguration` once at startup.
2. Replace `DBService.Connect()` with an injected `ISqlConnectionFactory`.
3. Register the connection factory and token service in `ServiceCollectionExtensions`.
4. Keep existing DAL code working while the new abstractions are introduced.

### Phase 2: Favorites slice first
Favorites is the safest first slice because it is small and isolated.
1. Create `IFavoriteRepository`.
2. Move the ADO.NET logic from `FavoriteService` into `SqlFavoriteRepository` implementing that interface.
3. Replace static `BL/FavoriteSpot.cs` with an injected `FavoriteService` class.
4. Inject `IFavoriteService` into `FavoritesController`.
5. Delete the remaining static entry points for favorites.

Why first:
- Small CRUD surface.
- Already used by the frontend map flow.
- Good place to prove the pattern before touching auth.

### Phase 3: Recommendations slice
1. Introduce `IRecommendationRepository` and `RecommendationService`.
2. Move normalization logic such as `BuildLocationId` into the service layer.
3. Update `RecommendationsController` to use injected services.

### Phase 4: Star party events slice
1. Introduce `IStarPartyEventRepository` and `StarPartyEventService`.
2. Move `NormalizeEventType`, `NormalizeStatus`, checklist cleanup, and ID creation into the service class.
3. Update `StarPartyEventsController` to use injected services.

This slice is larger, so do it after the repository pattern is already established.

### Phase 5: Users and authentication
1. Introduce `IUserRepository`.
2. Replace instance/static methods in `BL/User.cs` with an injected `UserService`.
3. Move registration and login flow into the service.
4. Introduce `ITokenService` for JWT creation.
5. Inject `IUserService` and `ITokenService` into `UsersController`.

This should be last because auth has the most cross-cutting behavior.

## Concrete first-pass registrations
Once the abstractions exist, `ServiceCollectionExtensions` should register them explicitly, for example:
- `services.AddScoped<ISqlConnectionFactory, SqlConnectionFactory>();`
- `services.AddScoped<IFavoriteRepository, SqlFavoriteRepository>();`
- `services.AddScoped<IRecommendationRepository, SqlRecommendationRepository>();`
- `services.AddScoped<IStarPartyEventRepository, SqlStarPartyEventRepository>();`
- `services.AddScoped<IUserRepository, SqlUserRepository>();`
- `services.AddScoped<IFavoriteService, FavoriteService>();`
- `services.AddScoped<IRecommendationService, RecommendationService>();`
- `services.AddScoped<IStarPartyEventService, StarPartyEventService>();`
- `services.AddScoped<IUserService, UserService>();`
- `services.AddScoped<ITokenService, JwtTokenService>();`

## What to avoid during the refactor
- Do not keep both static BL entry points and injected services for long.
- Do not inject repositories directly into controllers once service classes exist.
- Do not let repositories contain request/response DTO validation.
- Do not rebuild `ConfigurationBuilder` inside DAL classes.
- Do not refactor every controller at once.

## Definition of done for each slice
A slice is complete when:
- The controller depends on an interface.
- The service depends on repository interfaces only.
- The repository contains the SQL and stored-procedure calls.
- The feature can be unit-tested without hitting SQL Server.
- No `new SomeDalService()` calls remain in the migrated feature.

## Immediate next implementation step
Refactor favorites first. It is the smallest path to align the backend with the lecturer's DI/repository approach while giving the frontend a more reliable persistence boundary.
