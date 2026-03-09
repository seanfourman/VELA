CREATE OR ALTER PROCEDURE SP_GetStarPartyEventById
    @Id NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        E.Id,
        E.Title,
        E.EventType,
        E.Status,
        E.StartsAtUtc,
        E.EndsAtUtc,
        E.Lat,
        E.Lon,
        E.MeetupDetails,
        E.Description,
        E.HostChecklistJson,
        E.HostUserId,
        E.HostName,
        E.HostEmail,
        E.CreatedAtUtc,
        E.UpdatedAtUtc,
        ISNULL(
            (
                SELECT
                    CONVERT(NVARCHAR(36), R.UserId) AS [userId],
                    R.UserName AS [name],
                    R.UserEmail AS [email],
                    R.JoinedAtUtc AS [joinedAt]
                FROM StarPartyEventRsvps R
                WHERE R.EventId = E.Id
                ORDER BY R.JoinedAtUtc
                FOR JSON PATH
            ),
            '[]'
        ) AS RsvpsJson
    FROM StarPartyEvents E
    WHERE E.Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE SP_GetAllStarPartyEvents
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        E.Id,
        E.Title,
        E.EventType,
        E.Status,
        E.StartsAtUtc,
        E.EndsAtUtc,
        E.Lat,
        E.Lon,
        E.MeetupDetails,
        E.Description,
        E.HostChecklistJson,
        E.HostUserId,
        E.HostName,
        E.HostEmail,
        E.CreatedAtUtc,
        E.UpdatedAtUtc,
        ISNULL(
            (
                SELECT
                    CONVERT(NVARCHAR(36), R.UserId) AS [userId],
                    R.UserName AS [name],
                    R.UserEmail AS [email],
                    R.JoinedAtUtc AS [joinedAt]
                FROM StarPartyEventRsvps R
                WHERE R.EventId = E.Id
                ORDER BY R.JoinedAtUtc
                FOR JSON PATH
            ),
            '[]'
        ) AS RsvpsJson
    FROM StarPartyEvents E
    ORDER BY E.StartsAtUtc, E.Title;
END;
GO

CREATE OR ALTER PROCEDURE SP_UpsertStarPartyEvent
    @Id NVARCHAR(200),
    @Title NVARCHAR(200),
    @EventType NVARCHAR(40),
    @Status NVARCHAR(40),
    @StartsAtUtc DATETIME2,
    @EndsAtUtc DATETIME2 = NULL,
    @Lat FLOAT,
    @Lon FLOAT,
    @MeetupDetails NVARCHAR(MAX) = NULL,
    @Description NVARCHAR(MAX) = NULL,
    @HostChecklistJson NVARCHAR(MAX),
    @HostUserId UNIQUEIDENTIFIER = NULL,
    @HostName NVARCHAR(120) = NULL,
    @HostEmail NVARCHAR(255) = NULL,
    @UpdatedAtUtc DATETIME2
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM StarPartyEvents WHERE Id = @Id)
    BEGIN
        UPDATE StarPartyEvents
        SET Title = @Title,
            EventType = @EventType,
            Status = @Status,
            StartsAtUtc = @StartsAtUtc,
            EndsAtUtc = @EndsAtUtc,
            Lat = @Lat,
            Lon = @Lon,
            MeetupDetails = @MeetupDetails,
            Description = @Description,
            HostChecklistJson = @HostChecklistJson,
            HostUserId = @HostUserId,
            HostName = @HostName,
            HostEmail = @HostEmail,
            UpdatedAtUtc = @UpdatedAtUtc
        WHERE Id = @Id;
    END
    ELSE
    BEGIN
        INSERT INTO StarPartyEvents
        (
            Id, Title, EventType, Status, StartsAtUtc, EndsAtUtc, Lat, Lon,
            MeetupDetails, Description, HostChecklistJson, HostUserId, HostName, HostEmail,
            CreatedAtUtc, UpdatedAtUtc
        )
        VALUES
        (
            @Id, @Title, @EventType, @Status, @StartsAtUtc, @EndsAtUtc, @Lat, @Lon,
            @MeetupDetails, @Description, @HostChecklistJson, @HostUserId, @HostName, @HostEmail,
            @UpdatedAtUtc, @UpdatedAtUtc
        );
    END

    EXEC SP_GetStarPartyEventById @Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE SP_DeleteStarPartyEvent
    @Id NVARCHAR(200),
    @AffectedRows INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM StarPartyEvents
    WHERE Id = @Id;

    SET @AffectedRows = @@ROWCOUNT;
END;
GO

CREATE OR ALTER PROCEDURE SP_SetStarPartyEventStatus
    @Id NVARCHAR(200),
    @Status NVARCHAR(40),
    @UpdatedAtUtc DATETIME2
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE StarPartyEvents
    SET Status = @Status,
        UpdatedAtUtc = @UpdatedAtUtc
    WHERE Id = @Id;

    IF @@ROWCOUNT = 0
    BEGIN
        RETURN;
    END

    EXEC SP_GetStarPartyEventById @Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE SP_ToggleStarPartyRsvp
    @EventId NVARCHAR(200),
    @UserId UNIQUEIDENTIFIER,
    @UserName NVARCHAR(120),
    @UserEmail NVARCHAR(255) = NULL,
    @Joined BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM StarPartyEvents WHERE Id = @EventId)
    BEGIN
        SET @Joined = 0;
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM StarPartyEventRsvps WHERE EventId = @EventId AND UserId = @UserId)
    BEGIN
        DELETE FROM StarPartyEventRsvps
        WHERE EventId = @EventId
          AND UserId = @UserId;

        SET @Joined = 0;
    END
    ELSE
    BEGIN
        INSERT INTO StarPartyEventRsvps (Id, EventId, UserId, UserName, UserEmail, JoinedAtUtc)
        VALUES (NEWID(), @EventId, @UserId, @UserName, @UserEmail, SYSUTCDATETIME());

        SET @Joined = 1;
    END

    UPDATE StarPartyEvents
    SET UpdatedAtUtc = SYSUTCDATETIME()
    WHERE Id = @EventId;

    EXEC SP_GetStarPartyEventById @Id = @EventId;
END;
GO
