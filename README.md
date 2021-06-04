---
Topic: sample
Languages: Node.js
Products: azure-sdks
Services: Azure Stack Hub
---

# Official Microsoft Sample

<!-- 
Guidelines on README format: https://review.docs.microsoft.com/help/onboard/admin/samples/concepts/readme-template?branch=master

Guidance on onboarding samples to docs.microsoft.com/samples: https://review.docs.microsoft.com/help/onboard/admin/samples/process/onboarding?branch=master

Taxonomies for products and languages: https://review.docs.microsoft.com/new-hope/information-architecture/metadata/taxonomies?branch=master
-->

A sample code to create a virtual machine in Azure.

## Contents

| File/folder       | Description                                |
|-------------------|--------------------------------------------|
| `index.js`        | Sample source code.                        |
| `.gitignore`      | Define what to ignore at commit time.      |
| `package.json`    | Define dependencies.                       |
| `README.md`       | This README file.                          |
| `LICENSE`         | The license for the sample.                |

## Prerequisites

Refer to this azure stack doc for prerequisites link: https://docs.microsoft.com/en-us/azure-stack/user/azure-stack-version-profile-nodejs.

### Certificate

The first option is to use custom local certificate for NodeJS on Windows 10:

1. Get your AzureStack certificate object using the name of the certificate (Powershell Core script).
    ```powershells
    $mycert = Get-ChildItem Cert:\CurrentUser\Root | Where-Object Subject -eq "CN=MyAzureCertName"
    ```
1. Export the certificate as a .cer file.
    ```powershells
    Export-Certificate -Type CERT -FilePath mycert.cer -Cert $mycert
    ```
1. Convert .cer file to .pem file (you can use openssl tool that is installed with Git bash and is located in `C:\Program Files\Git\usr\bin`).
    ```powershells
    openssl x509 -inform der -in mycert.cer -out mypem.pem
    ```
1. Set `NODE_EXTRA_CA_CERTS` environment variable.
    ```powershells
    NODE_EXTRA_CA_CERTS=<PATH TO mypem.pem file>
    ```

The second option is to disable TLS validation without setting `NODE_EXTRA_CA_CERTS` to the local NodeJS .pem file.
```javascript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
```

### Virtual Machine

The sample currently looks to create the following VM. Make sure it is available or the sample will fail.

| Type              | Value                                                 |
|-----------------------|-------------------------------------------------------------|
| PublisherName       | canonical                            |
| Offer       | UbuntuServer                        |
| Sku           | 16.04-LTS                                   |

Alternatively, simply go into the `index.js` and change the values to match a virtual machine that you have available in your Azure Stack environment.

```javascript
// Ubuntu config
var publisher = 'Canonical';
var offer = 'UbuntuServer';
var sku = '16.04-LTS';
```

To find available virtual machines, search for `Marketplace management` in the Azure Stack portal. If no virtual machines are available, click on `Add from Azure` to download a new one.

For example, if you have `Windows Server 2016 Datacenter-Pay as you go` marketplace item, you can set those variables to the following to create a Windows 2016-Datacenter virtual machine:

```javascript
// Windows config
var publisher = 'MicrosoftWindowsServer';
var offer = 'WindowsServer';
var sku = '2016-Datacenter';
```
## Setup

Set following environment variables:
| Variable              | Description                                                 |
|-----------------------|-------------------------------------------------------------|
| `AZURE_SP_APP_ID`       | Service principal application id                            |
| `AZURE_SP_APP_SECRET`       | Service principal application secret                        |
| `AZURE_TENANT_ID`           | Azure Stack Hub tenant ID                                   |
| `AZURE_SUBSCRIPTION_ID`     | Subscription id used to access offers in Azure Stack Hub    |
| `AZURE_ARM_ENDPOINT`        | Azure Stack Hub Resource Manager Endpoint                   |
| `AZURE_LOCATION`            | Resource location                                           |

Service principal example:

AAD
```
Secret                : System.Security.SecureString                                 # AZURE_SP_APP_SECRET
ServicePrincipalNames : {bd6bb75f-5fd6-4db9-91b7-4a6941e7feb9, http://azs-sptest01}
ApplicationId         : bd6bb75f-5fd6-4db9-91b7-4a6941e7feb9                         # AZURE_SP_APP_ID
DisplayName           : azs-sptest01
Id                    : 36a22ee4-e2b0-411d-8f21-0ea8b4b5c46f                         # AZURE_SP_APP_OBJECT_ID
AdfsId                : 
Type                  : ServicePrincipal
```

ADFS
```
ApplicationIdentifier : S-1-5-21-2937821301-3551617933-4294865508-76632              # AZURE_SP_APP_OBJECT_ID
ClientId              : 7591924e-0341-4812-8d23-52ef0aa27eff                         # AZURE_SP_APP_ID                   
Thumbprint            : 
ApplicationName       : Azurestack-azs-sptest01
ClientSecret          : <Redacted>                                                   # AZURE_SP_APP_SECRET
PSComputerName        : <Redacted>
RunspaceId            : e841cbbc-3d8e-45fd-b63f-42adbfbf664b
```

## Running the sample

From root folder
```
npm install
node .\index.js
```

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
