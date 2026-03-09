SET NOCOUNT ON;

DECLARE @NowUtc DATETIME2 = SYSUTCDATETIME();

DECLARE @RecommendationsSeed TABLE
(
    Id NVARCHAR(200) NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    Country NVARCHAR(120) NULL,
    Region NVARCHAR(120) NULL,
    [Type] NVARCHAR(80) NULL,
    Description NVARCHAR(MAX) NULL,
    BestTime NVARCHAR(120) NULL,
    Lat FLOAT NOT NULL,
    Lon FLOAT NOT NULL,
    PhotoUrlsJson NVARCHAR(MAX) NOT NULL,
    SourceUrlsJson NVARCHAR(MAX) NOT NULL
);

INSERT INTO @RecommendationsSeed
(
    Id, Name, Country, Region, [Type], Description, BestTime, Lat, Lon, PhotoUrlsJson, SourceUrlsJson
)
VALUES
    (
        N'namibrand-dark-sky',
        N'NamibRand Nature Reserve',
        N'Namibia',
        N'Hardap Region',
        N'desert reserve',
        N'Ultra-dark skies and dry air make this one of the best Milky Way locations in Africa.',
        N'May-September (new moon)',
        -25.0580,
        15.9370,
        N'[]',
        N'[]'
    ),
    (
        N'atacama-san-pedro',
        N'Atacama Desert (San Pedro de Atacama)',
        N'Chile',
        N'Antofagasta Region',
        N'desert',
        N'High altitude, low humidity, and minimal light pollution create top-tier deep-sky conditions.',
        N'April-October (new moon)',
        -22.9087,
        -68.1997,
        N'[]',
        N'[]'
    ),
    (
        N'mauna-kea-summit',
        N'Mauna Kea Summit',
        N'United States',
        N'Hawaii',
        N'mountain',
        N'Exceptional altitude and stable air, especially good for planetary and deep-sky observing.',
        N'Year-round (best in dry season)',
        19.8207,
        -155.4681,
        N'[]',
        N'[]'
    ),
    (
        N'cherry-springs-state-park',
        N'Cherry Springs State Park',
        N'United States',
        N'Pennsylvania',
        N'dark sky park',
        N'One of the most popular dark-sky parks in North America with dedicated observing fields.',
        N'Spring-fall (new moon weekends)',
        41.6634,
        -77.8164,
        N'[]',
        N'[]'
    ),
    (
        N'death-valley-dantes-view',
        N'Death Valley National Park (Dantes View)',
        N'United States',
        N'California',
        N'national park',
        N'Large dark-sky area with expansive horizons and consistently clear desert nights.',
        N'October-April',
        36.2207,
        -116.7264,
        N'[]',
        N'[]'
    ),
    (
        N'mackenzie-dark-sky-reserve',
        N'Aoraki Mackenzie Dark Sky Reserve',
        N'New Zealand',
        N'South Island',
        N'dark sky reserve',
        N'Southern Hemisphere favorite with strong infrastructure for astrophotography and public observing.',
        N'March-October',
        -44.0030,
        170.4630,
        N'[]',
        N'[]'
    ),
    (
        N'roque-de-los-muchachos',
        N'Roque de los Muchachos',
        N'Spain',
        N'La Palma, Canary Islands',
        N'observatory region',
        N'High mountain skies and strict light-pollution controls make this a premium Atlantic observing site.',
        N'Summer and autumn',
        28.7589,
        -17.8899,
        N'[]',
        N'[]'
    ),
    (
        N'teide-national-park',
        N'Teide National Park',
        N'Spain',
        N'Tenerife, Canary Islands',
        N'national park',
        N'Volcanic plateau with high elevation and clear nights suitable for wide-field Milky Way sessions.',
        N'Spring-autumn',
        28.2724,
        -16.6425,
        N'[]',
        N'[]'
    ),
    (
        N'wadi-rum-protected-area',
        N'Wadi Rum Protected Area',
        N'Jordan',
        N'Aqaba Governorate',
        N'desert',
        N'Remote red-desert landscape with broad horizons and strong naked-eye visibility.',
        N'March-May, September-November',
        29.5760,
        35.4210,
        N'[]',
        N'[]'
    ),
    (
        N'uluru-kata-tjuta',
        N'Uluru-Kata Tjuta National Park',
        N'Australia',
        N'Northern Territory',
        N'national park',
        N'Outback conditions and low local light produce excellent southern-sky observing.',
        N'April-September',
        -25.3444,
        131.0369,
        N'[]',
        N'[]'
    ),
    (
        N'jasper-dark-sky-preserve',
        N'Jasper Dark Sky Preserve',
        N'Canada',
        N'Alberta',
        N'dark sky preserve',
        N'Large protected sky area with high-quality transparency and mountain foregrounds.',
        N'September-March',
        52.8737,
        -118.0814,
        N'[]',
        N'[]'
    ),
    (
        N'brecon-beacons',
        N'Bannau Brycheiniog (Brecon Beacons) Dark Sky Reserve',
        N'United Kingdom',
        N'Wales',
        N'dark sky reserve',
        N'Accessible European dark-sky reserve with multiple roadside observing points.',
        N'October-March',
        51.8830,
        -3.4360,
        N'[]',
        N'[]'
    ),
    (
        N'bryce-canyon-national-park',
        N'Bryce Canyon National Park',
        N'United States',
        N'Utah',
        N'national park',
        N'High-elevation desert park with very dark skies and strong public astronomy programs.',
        N'May-October',
        37.5930,
        -112.1871,
        N'[]',
        N'[]'
    ),
    (
        N'big-bend-national-park',
        N'Big Bend National Park',
        N'United States',
        N'Texas',
        N'national park',
        N'Remote desert park known for low light pollution and broad open horizons.',
        N'October-April',
        29.2498,
        -103.2502,
        N'[]',
        N'[]'
    ),
    (
        N'natural-bridges-monument',
        N'Natural Bridges National Monument',
        N'United States',
        N'Utah',
        N'dark sky park',
        N'Historic dark-sky site with clean, dry air and excellent naked-eye visibility.',
        N'Spring-autumn',
        37.5936,
        -110.0011,
        N'[]',
        N'[]'
    ),
    (
        N'borrego-springs-dark-sky',
        N'Anza-Borrego (Borrego Springs)',
        N'United States',
        N'California',
        N'dark sky community',
        N'Accessible dark-sky area in Southern California, great for quick observing trips.',
        N'October-April',
        33.2550,
        -116.3750,
        N'[]',
        N'[]'
    ),
    (
        N'alqueva-dark-sky-reserve',
        N'Alqueva Dark Sky Reserve',
        N'Portugal',
        N'Alentejo',
        N'dark sky reserve',
        N'Large certified reserve with stable weather and many low-light rural viewpoints.',
        N'March-October',
        38.2170,
        -7.5390,
        N'[]',
        N'[]'
    ),
    (
        N'mont-megantic-dark-sky',
        N'Mont-Megantic International Dark Sky Reserve',
        N'Canada',
        N'Quebec',
        N'dark sky reserve',
        N'Well-known reserve with observatory access and strong astrophotography conditions.',
        N'September-March',
        45.4554,
        -71.1534,
        N'[]',
        N'[]'
    ),
    (
        N'kielder-forest-observatory',
        N'Kielder Forest and Observatory',
        N'United Kingdom',
        N'Northumberland',
        N'dark sky park',
        N'One of the darkest UK mainland locations with active observing and outreach events.',
        N'October-March',
        55.2360,
        -2.5800,
        N'[]',
        N'[]'
    ),
    (
        N'galloway-forest-park',
        N'Galloway Forest Park',
        N'United Kingdom',
        N'Scotland',
        N'dark sky park',
        N'Large dark-sky area with low population density and multiple roadside viewpoints.',
        N'Autumn-winter',
        55.0660,
        -4.4860,
        N'[]',
        N'[]'
    ),
    (
        N'westhavelland-dark-sky',
        N'Westhavelland Dark Sky Reserve',
        N'Germany',
        N'Brandenburg',
        N'dark sky reserve',
        N'One of the best lowland observing areas in central Europe, especially in winter.',
        N'October-February',
        52.7350,
        12.4560,
        N'[]',
        N'[]'
    ),
    (
        N'pic-du-midi',
        N'Pic du Midi',
        N'France',
        N'Hautes-Pyrenees',
        N'mountain observatory',
        N'High mountain location with excellent transparency and a long astronomy heritage.',
        N'Summer-autumn',
        42.9367,
        0.1422,
        N'[]',
        N'[]'
    ),
    (
        N'sark-dark-sky-island',
        N'Sark Dark Sky Island',
        N'United Kingdom',
        N'Channel Islands',
        N'dark sky island',
        N'Low artificial lighting and ocean horizons make Sark ideal for naked-eye observing.',
        N'Year-round',
        49.4330,
        -2.3670,
        N'[]',
        N'[]'
    ),
    (
        N'warrumbungle-dark-sky-park',
        N'Warrumbungle Dark Sky Park',
        N'Australia',
        N'New South Wales',
        N'dark sky park',
        N'Australia flagship dark-sky park near major observatories and very dark rural skies.',
        N'April-September',
        -31.2800,
        149.0700,
        N'[]',
        N'[]'
    ),
    (
        N'elqui-valley',
        N'Elqui Valley',
        N'Chile',
        N'Coquimbo Region',
        N'valley',
        N'Consistently dry skies and established astro-tourism infrastructure support deep-sky nights.',
        N'April-October',
        -30.1320,
        -70.4920,
        N'[]',
        N'[]'
    ),
    (
        N'salar-de-uyuni',
        N'Salar de Uyuni',
        N'Bolivia',
        N'Potosi Department',
        N'salt flat',
        N'High-altitude salt flats with expansive horizons and dramatic nightscape reflections.',
        N'May-October',
        -20.1338,
        -67.4891,
        N'[]',
        N'[]'
    ),
    (
        N'merzouga-erg-chebbi',
        N'Merzouga (Erg Chebbi Dunes)',
        N'Morocco',
        N'Draa-Tafilalet',
        N'desert',
        N'Saharan dunes offer dark horizons and strong Milky Way visibility in dry seasons.',
        N'October-April',
        31.0800,
        -4.0100,
        N'[]',
        N'[]'
    ),
    (
        N'abisko-national-park',
        N'Abisko National Park',
        N'Sweden',
        N'Lapland',
        N'national park',
        N'Arctic site known for clear skies and aurora opportunities in addition to dark-sky observing.',
        N'September-March',
        68.3596,
        18.7833,
        N'[]',
        N'[]'
    );

MERGE Recommendations AS target
USING @RecommendationsSeed AS source
ON target.Id = source.Id
WHEN MATCHED THEN
    UPDATE SET
        Name = source.Name,
        Country = source.Country,
        Region = source.Region,
        [Type] = source.[Type],
        Description = source.Description,
        BestTime = source.BestTime,
        Lat = source.Lat,
        Lon = source.Lon,
        PhotoUrlsJson = source.PhotoUrlsJson,
        SourceUrlsJson = source.SourceUrlsJson,
        UpdatedAtUtc = @NowUtc
WHEN NOT MATCHED THEN
    INSERT
    (
        Id, Name, Country, Region, [Type], Description, BestTime, Lat, Lon,
        PhotoUrlsJson, SourceUrlsJson, CreatedAtUtc, UpdatedAtUtc
    )
    VALUES
    (
        source.Id, source.Name, source.Country, source.Region, source.[Type], source.Description,
        source.BestTime, source.Lat, source.Lon, source.PhotoUrlsJson, source.SourceUrlsJson, @NowUtc, @NowUtc
    );

DECLARE @HostUserId UNIQUEIDENTIFIER =
(
    SELECT TOP 1 Id
    FROM Users
    WHERE Email = N'seanfourm@gmail.com'
);

DECLARE @HostName NVARCHAR(120) =
(
    SELECT TOP 1 COALESCE(NULLIF(DisplayName, N''), NULLIF(Name, N''), N'VELA Admin')
    FROM Users
    WHERE Id = @HostUserId
);

DECLARE @HostEmail NVARCHAR(255) =
(
    SELECT TOP 1 Email
    FROM Users
    WHERE Id = @HostUserId
);

DECLARE @EventsSeed TABLE
(
    Id NVARCHAR(200) NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    EventType NVARCHAR(40) NOT NULL,
    Status NVARCHAR(40) NOT NULL,
    StartsAtUtc DATETIME2 NOT NULL,
    EndsAtUtc DATETIME2 NULL,
    Lat FLOAT NOT NULL,
    Lon FLOAT NOT NULL,
    MeetupDetails NVARCHAR(MAX) NULL,
    Description NVARCHAR(MAX) NULL,
    HostChecklistJson NVARCHAR(MAX) NOT NULL,
    HostUserId UNIQUEIDENTIFIER NULL,
    HostName NVARCHAR(120) NULL,
    HostEmail NVARCHAR(255) NULL
);

INSERT INTO @EventsSeed
(
    Id, Title, EventType, Status, StartsAtUtc, EndsAtUtc, Lat, Lon, MeetupDetails, Description,
    HostChecklistJson, HostUserId, HostName, HostEmail
)
VALUES
    (
        N'il-ramon-crater-new-moon-2026-04-18',
        N'Ramon Crater New Moon Star Party',
        N'party',
        N'published',
        '2026-04-18 16:30:00',
        '2026-04-18 20:30:00',
        30.6090,
        34.8010,
        N'Mitzpe Ramon Visitor Center parking lot, meet at 19:15 local time.',
        N'Community observing night focused on Milky Way objects from the Ramon crater rim.',
        N'["Red flashlight","Warm layer","Binoculars or telescope","Water"]',
        @HostUserId,
        @HostName,
        @HostEmail
    ),
    (
        N'il-sde-boker-deep-sky-2026-05-16',
        N'Negev Deep Sky Marathon (Sde Boker)',
        N'special_event',
        N'published',
        '2026-05-16 17:00:00',
        '2026-05-16 22:00:00',
        30.8730,
        34.7820,
        N'Ben-Gurion Midreshet lookout. Parking coordination via admin group.',
        N'Long-session event for galaxies and nebulae with guided object list and imaging windows.',
        N'["Star atlas/app","Power bank","Tripod","Snacks"]',
        @HostUserId,
        @HostName,
        @HostEmail
    ),
    (
        N'il-dead-sea-milky-way-2026-06-13',
        N'Dead Sea Milky Way Night',
        N'party',
        N'published',
        '2026-06-13 17:30:00',
        '2026-06-13 21:30:00',
        31.1990,
        35.3620,
        N'Ein Bokek south promenade, assemble near the last light pole.',
        N'Wide-field observing and beginner astrophotography session with low-horizon southern targets.',
        N'["DSLR or phone adapter","Mat/chair","Red light","Water"]',
        @HostUserId,
        @HostName,
        @HostEmail
    ),
    (
        N'il-golan-perseids-2026-08-12',
        N'Golan Perseids Peak Watch',
        N'special_event',
        N'published',
        '2026-08-12 18:00:00',
        '2026-08-13 00:30:00',
        33.1960,
        35.7740,
        N'Odem Forest clearing, exact pin shared on event day.',
        N'Perseids-peak overnight watch with meteor counting challenge and wide-angle imaging spots.',
        N'["Sleeping bag","Warm jacket","Insect repellent","Headlamp with red mode"]',
        @HostUserId,
        @HostName,
        @HostEmail
    ),
    (
        N'il-jerusalem-hills-planets-2026-09-19',
        N'Jerusalem Hills Lunar and Planet Night',
        N'party',
        N'published',
        '2026-09-19 16:00:00',
        '2026-09-19 20:00:00',
        31.7700,
        35.0300,
        N'Nes Harim overlook, family-friendly setup area near picnic zone.',
        N'Early-evening public outreach event focused on the Moon, Saturn, and Jupiter.',
        N'["Small telescope/binoculars","Blanket","Snacks","Water"]',
        @HostUserId,
        @HostName,
        @HostEmail
    ),
    (
        N'il-eilat-desert-finale-2026-10-17',
        N'Eilat Desert Sky Finale',
        N'special_event',
        N'published',
        '2026-10-17 17:00:00',
        '2026-10-17 22:00:00',
        29.5600,
        34.9500,
        N'Eilat Mountains dark pull-off, convoy leaves city at 19:00 local time.',
        N'Season-closing deep-sky event with visual observing lanes and astrophotography mentoring.',
        N'["Collimation tools","Extra battery","Dew control","Warm clothes"]',
        @HostUserId,
        @HostName,
        @HostEmail
    );

MERGE StarPartyEvents AS target
USING @EventsSeed AS source
ON target.Id = source.Id
WHEN MATCHED THEN
    UPDATE SET
        Title = source.Title,
        EventType = source.EventType,
        Status = source.Status,
        StartsAtUtc = source.StartsAtUtc,
        EndsAtUtc = source.EndsAtUtc,
        Lat = source.Lat,
        Lon = source.Lon,
        MeetupDetails = source.MeetupDetails,
        Description = source.Description,
        HostChecklistJson = source.HostChecklistJson,
        HostUserId = source.HostUserId,
        HostName = source.HostName,
        HostEmail = source.HostEmail,
        UpdatedAtUtc = @NowUtc
WHEN NOT MATCHED THEN
    INSERT
    (
        Id, Title, EventType, Status, StartsAtUtc, EndsAtUtc, Lat, Lon, MeetupDetails,
        Description, HostChecklistJson, HostUserId, HostName, HostEmail, CreatedAtUtc, UpdatedAtUtc
    )
    VALUES
    (
        source.Id, source.Title, source.EventType, source.Status, source.StartsAtUtc, source.EndsAtUtc,
        source.Lat, source.Lon, source.MeetupDetails, source.Description, source.HostChecklistJson,
        source.HostUserId, source.HostName, source.HostEmail, @NowUtc, @NowUtc
    );
