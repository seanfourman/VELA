IF OBJECT_ID(N'StarPartyEvents', N'U') IS NULL
BEGIN
    CREATE TABLE StarPartyEvents
    (
        Id NVARCHAR(200) NOT NULL PRIMARY KEY,
        Title NVARCHAR(200) NOT NULL,
        EventType NVARCHAR(40) NOT NULL CONSTRAINT DF_StarPartyEvents_EventType DEFAULT('party'),
        Status NVARCHAR(40) NOT NULL CONSTRAINT DF_StarPartyEvents_Status DEFAULT('draft'),
        StartsAtUtc DATETIME2 NOT NULL,
        EndsAtUtc DATETIME2 NULL,
        Lat FLOAT NOT NULL,
        Lon FLOAT NOT NULL,
        MeetupDetails NVARCHAR(MAX) NULL,
        Description NVARCHAR(MAX) NULL,
        HostChecklistJson NVARCHAR(MAX) NOT NULL CONSTRAINT DF_StarPartyEvents_HostChecklistJson DEFAULT('[]'),
        HostUserId UNIQUEIDENTIFIER NULL,
        HostName NVARCHAR(120) NULL,
        HostEmail NVARCHAR(255) NULL,
        CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_StarPartyEvents_CreatedAtUtc DEFAULT(SYSUTCDATETIME()),
        UpdatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_StarPartyEvents_UpdatedAtUtc DEFAULT(SYSUTCDATETIME()),
        CONSTRAINT FK_StarPartyEvents_Users FOREIGN KEY(HostUserId) REFERENCES Users(Id) ON DELETE SET NULL
    );
END;

IF OBJECT_ID(N'StarPartyEventRsvps', N'U') IS NULL
BEGIN
    CREATE TABLE StarPartyEventRsvps
    (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        EventId NVARCHAR(200) NOT NULL,
        UserId UNIQUEIDENTIFIER NOT NULL,
        UserName NVARCHAR(120) NOT NULL,
        UserEmail NVARCHAR(255) NULL,
        JoinedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_StarPartyEventRsvps_JoinedAtUtc DEFAULT(SYSUTCDATETIME()),
        CONSTRAINT FK_StarPartyEventRsvps_Events FOREIGN KEY(EventId) REFERENCES StarPartyEvents(Id) ON DELETE CASCADE,
        CONSTRAINT FK_StarPartyEventRsvps_Users FOREIGN KEY(UserId) REFERENCES Users(Id) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_StarPartyEventRsvps_EventId_UserId'
      AND object_id = OBJECT_ID(N'StarPartyEventRsvps')
)
BEGIN
    CREATE UNIQUE INDEX IX_StarPartyEventRsvps_EventId_UserId
        ON StarPartyEventRsvps(EventId, UserId);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_StarPartyEvents_Status_StartsAtUtc'
      AND object_id = OBJECT_ID(N'StarPartyEvents')
)
BEGIN
    CREATE INDEX IX_StarPartyEvents_Status_StartsAtUtc
        ON StarPartyEvents(Status, StartsAtUtc);
END;
