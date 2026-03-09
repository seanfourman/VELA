CREATE OR ALTER PROCEDURE SP_GetAllRecommendations
AS
BEGIN
    SET NOCOUNT ON;

    SELECT Id, Name, Country, Region, [Type], Description, BestTime, Lat, Lon, PhotoUrlsJson, SourceUrlsJson
    FROM Recommendations
    ORDER BY Name;
END;
GO

CREATE OR ALTER PROCEDURE SP_GetRecommendationById
    @Id NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 Id, Name, Country, Region, [Type], Description, BestTime, Lat, Lon, PhotoUrlsJson, SourceUrlsJson
    FROM Recommendations
    WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE SP_UpsertRecommendation
    @Id NVARCHAR(200),
    @Name NVARCHAR(200),
    @Country NVARCHAR(120) = NULL,
    @Region NVARCHAR(120) = NULL,
    @Type NVARCHAR(80) = NULL,
    @Description NVARCHAR(MAX) = NULL,
    @BestTime NVARCHAR(120) = NULL,
    @Lat FLOAT,
    @Lon FLOAT,
    @PhotoUrlsJson NVARCHAR(MAX),
    @SourceUrlsJson NVARCHAR(MAX),
    @UpdatedAtUtc DATETIME2
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM Recommendations WHERE Id = @Id)
    BEGIN
        UPDATE Recommendations
        SET Name = @Name,
            Country = @Country,
            Region = @Region,
            [Type] = @Type,
            Description = @Description,
            BestTime = @BestTime,
            Lat = @Lat,
            Lon = @Lon,
            PhotoUrlsJson = @PhotoUrlsJson,
            SourceUrlsJson = @SourceUrlsJson,
            UpdatedAtUtc = @UpdatedAtUtc
        WHERE Id = @Id;
    END
    ELSE
    BEGIN
        INSERT INTO Recommendations
        (
            Id, Name, Country, Region, [Type], Description, BestTime, Lat, Lon,
            PhotoUrlsJson, SourceUrlsJson, CreatedAtUtc, UpdatedAtUtc
        )
        VALUES
        (
            @Id, @Name, @Country, @Region, @Type, @Description, @BestTime, @Lat, @Lon,
            @PhotoUrlsJson, @SourceUrlsJson, @UpdatedAtUtc, @UpdatedAtUtc
        );
    END

    SELECT TOP 1 Id, Name, Country, Region, [Type], Description, BestTime, Lat, Lon, PhotoUrlsJson, SourceUrlsJson
    FROM Recommendations
    WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE SP_DeleteRecommendation
    @Id NVARCHAR(200),
    @AffectedRows INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM Recommendations
    WHERE Id = @Id;

    SET @AffectedRows = @@ROWCOUNT;
END;
GO
