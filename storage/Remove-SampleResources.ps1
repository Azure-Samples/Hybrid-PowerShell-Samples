# Run this script to delete resources created during the sample run. 
$resourceGroupName = "azure-powershell-sample-rg"
Remove-AzResourceGroup -Name $resourceGroupName -Force