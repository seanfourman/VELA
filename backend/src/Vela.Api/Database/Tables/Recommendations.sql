IF OBJECT_ID(N'Recommendations', N'U') IS NULL
BEGIN
    CREATE TABLE Recommendations
    (
        Id NVARCHAR(200) NOT NULL PRIMARY KEY,
        Name NVARCHAR(200) NOT NULL,
        Country NVARCHAR(120) NULL,
        Region NVARCHAR(120) NULL,
        [Type] NVARCHAR(80) NULL,
        Description NVARCHAR(MAX) NULL,
        BestTime NVARCHAR(120) NULL,
        Lat FLOAT NOT NULL,
        Lon FLOAT NOT NULL,
        PhotoUrlsJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_Recommendations_PhotoUrlsJson DEFAULT('[]'),
        SourceUrlsJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_Recommendations_SourceUrlsJson DEFAULT('[]'),
        CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_Recommendations_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_Recommendations_UpdatedAtUtc DEFAULT(SYSUTCDATETIME())
    );
END;
