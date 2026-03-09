IF OBJECT_ID(N'Favorites', N'U') IS NULL
BEGIN
    CREATE TABLE Favorites
    (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        SpotId NVARCHAR(200) NOT NULL,
        Lat FLOAT NOT NULL,
        Lon FLOAT NOT NULL,
        CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_Favorites_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        CONSTRAINT FK_Favorites_Users FOREIGN KEY(UserId) REFERENCES Users(Id) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Favorites_UserId_SpotId'
      AND object_id = OBJECT_ID(N'Favorites')
)
BEGIN
    CREATE UNIQUE INDEX IX_Favorites_UserId_SpotId ON Favorites(UserId, SpotId);
END;
