$config = Get-Content "${PSScriptRoot}/../azureAppSpConfig.json" | ConvertFrom-Json

$resourceGroupName = "azure-powershell-sample-rg"
$storageAccountName = "samplestorageaccount"
$environmentName = "AzurePowerShellSampleEnv"
$containerName = "azure-container-name"

# Add the Azure Stack Hub environment if it doesn't exist, otherwise use existing one.
$environmentExists = Get-AzEnvironment | Where-Object {$_.ResourceManagerUrl -eq $config.resourceManagerUrl}
if (!$environmentExists)
{
    Add-AzEnvironment -Name $environmentName -ARMEndpoint $config.resourceManagerUrl
}
else
{
    $environmentName = $environmentExists.Name
}

# Connect to Azure Stack Hub service principal.
$secureClientSecret = $config.clientSecret | ConvertTo-SecureString -AsPlainText -Force
$servicePrincipalCredential = New-Object System.Management.Automation.PSCredential ($config.clientId, $secureClientSecret)

Connect-AzAccount -ServicePrincipal `
    -Environment $EnvironmentName `
    -Credential $servicePrincipalCredential `
    -TenantId $config.tenantId `
    -Subscription $config.subscriptionId 

# Create resource group by the name $resourceGroupName if it doesn't exist.
$resourceGroupExists = Get-AzResourceGroup -Name $resourceGroupName
if (!$resourceGroupExists)
{
    New-AzResourceGroup -Name $resourceGroupName -Location $config.location
}

# Create storage account by the name $storageAccountName if it doesn't exist.
$storageAccountExists = Get-AzStorageAccount -Name $storageAccountName -ResourceGroupName $resourceGroupName
if (!$storageAccountExists)
{
    $storageAccount = New-AzStorageAccount -ResourceGroupName $resourceGroupName `
        -AccountName $storageAccountName `
        -Location $config.location `
        -SkuName Standard_LRS
}

# Create storage container by the name $containerName if it doesn't exist.
$containerExists = Get-AzStorageContainer -Name $containerName -Context $storageAccount.Context
if (!$containerExists )
{
    New-AzStorageContainer -Name $containerName -Permission Off -Context $storageAccount.Context
}

# Upload test file to the storage container.
Set-AzStorageBlobContent -File "${PSScriptRoot}/test-upload-file.txt" `
  -Container $containerName `
  -Blob "azure-sample/test-upload-file.txt" `
  -Context $storageAccount.Context