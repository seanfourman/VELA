CREATE OR ALTER PROCEDURE SP_GetUserByEmail
    @Email NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 Id, Email, Name, DisplayName, AvatarUrl, Bio, HashedPassword, IsAdmin, Role, CreatedAtUtc
    FROM Users
    WHERE Email = @Email;
END;
GO

CREATE OR ALTER PROCEDURE SP_GetUserById
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1 Id, Email, Name, DisplayName, AvatarUrl, Bio, HashedPassword, IsAdmin, Role, CreatedAtUtc
    FROM Users
    WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE SP_InsertUser
    @Id UNIQUEIDENTIFIER,
    @Email NVARCHAR(255),
    @Name NVARCHAR(120),
    @DisplayName NVARCHAR(120) = NULL,
    @AvatarUrl NVARCHAR(500) = NULL,
    @Bio NVARCHAR(500) = NULL,
    @HashedPassword NVARCHAR(255),
    @IsAdmin BIT,
    @Role NVARCHAR(20),
    @CreatedAtUtc DATETIME2
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO Users (Id, Email, Name, DisplayName, AvatarUrl, Bio, HashedPassword, IsAdmin, Role, CreatedAtUtc)
    VALUES (@Id, @Email, @Name, @DisplayName, @AvatarUrl, @Bio, @HashedPassword, @IsAdmin, @Role, @CreatedAtUtc);
END;
GO

CREATE OR ALTER PROCEDURE SP_GetUserProfile
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        COALESCE(DisplayName, Name, '') AS DisplayName,
        ISNULL(AvatarUrl, '') AS AvatarUrl,
        ISNULL(Bio, '') AS Bio
    FROM Users
    WHERE Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE SP_UpdateUserProfile
    @Id UNIQUEIDENTIFIER,
    @DisplayName NVARCHAR(120) = NULL,
    @AvatarUrl NVARCHAR(500) = NULL,
    @Bio NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Users
    SET DisplayName = @DisplayName,
        AvatarUrl = @AvatarUrl,
        Bio = @Bio
    WHERE Id = @Id;

    IF @@ROWCOUNT = 0
    BEGIN
        RETURN;
    END

    EXEC SP_GetUserProfile @Id = @Id;
END;
GO

CREATE OR ALTER PROCEDURE SP_AnyAdminExists
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COUNT(1) AS TotalAdmins
    FROM Users
    WHERE IsAdmin = 1;
END;
GO
