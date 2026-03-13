CREATE OR ALTER PROCEDURE SP_GetFavoritesByUserId
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT SpotId, Lat, Lon, CreatedAtUtc, CustomName
    FROM Favorites
    WHERE UserId = @UserId
    ORDER BY CreatedAtUtc DESC;
END;
GO

CREATE OR ALTER PROCEDURE SP_GetFavoriteByUserAndSpot
    @UserId UNIQUEIDENTIFIER,
    @SpotId NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 SpotId, Lat, Lon, CreatedAtUtc, CustomName
    FROM Favorites
    WHERE UserId = @UserId
      AND SpotId = @SpotId;
END;
GO

CREATE OR ALTER PROCEDURE SP_InsertFavorite
    @Id UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER,
    @SpotId NVARCHAR(200),
    @Lat FLOAT,
    @Lon FLOAT,
    @CustomName NVARCHAR(120) = NULL,
    @CreatedAtUtc DATETIME2
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Favorites (Id, UserId, SpotId, Lat, Lon, CustomName, CreatedAtUtc)
    VALUES (@Id, @UserId, @SpotId, @Lat, @Lon, @CustomName, @CreatedAtUtc);
END;
GO

CREATE OR ALTER PROCEDURE SP_UpdateFavoriteCustomName
    @UserId UNIQUEIDENTIFIER,
    @SpotId NVARCHAR(200),
    @CustomName NVARCHAR(120) = NULL,
    @AffectedRows INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Favorites
    SET CustomName = @CustomName
    WHERE UserId = @UserId
      AND SpotId = @SpotId;

    SET @AffectedRows = @@ROWCOUNT;
END;
GO

CREATE OR ALTER PROCEDURE SP_DeleteFavorite
    @UserId UNIQUEIDENTIFIER,
    @SpotId NVARCHAR(200),
    @AffectedRows INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM Favorites
    WHERE UserId = @UserId
      AND SpotId = @SpotId;

    SET @AffectedRows = @@ROWCOUNT;
END;
GO
