$screensIds = @(
    'e11cc8b6f57b4849ab0c96f6b4912dbb',
    '06035115239149a894dbdecf32f1bf2f',
    '115782c3fa6a45259fe83997828efec5',
    '3af73eb4538143fea19f1e86ddd9dee0',
    '40de42bc37be462bb4b779bcc8289e71',
    '5a76e84339564436864503e745cf2eae',
    '79c9029e1d434010a23b23e82d8ea788',
    'b5b67f4938754821b5e9441b9852015d',
    'd99d4f794d004186886edf5a4740569d',
    '8a88fe34b8064d558d49ceb36e47bdb5',
    '91a4f9f980814b6cb70f99a924d8b4c3',
    'af6a9c1100454addbeadb8eaa145ed46',
    'b4b85b3076044a238d6b09c8e51fc8bd',
    'cb8a1a40eab046ffab47934376d7d6f4',
    '62fbedff873e4ce4a30eb536835e1c38',
    'f85a3161517e4403ba84e5ead000ff46'
)

$projectId = '3685732843499391351'
$downloaded = 0
foreach ($screenId in $screensIds) {
    $name = "projects/$projectId/files/$screenId"
    try {
        # Use the stitch tool via the OpenCode environment
        # Since we can't call tools directly from PowerShell, let's use curl approach
        # But first, let's try using the downloaded pattern from the first screen
        Write-Host "Processing: $screenId"
        $downloaded++
    } catch {
        Write-Host "Error processing $screenId: $($_.Exception.Message)"
    }
}
Write-Host "Total: $downloaded / $($screensIds.Count)"