/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */
'use strict';
var Environment = require("@azure/ms-rest-azure-env");
var util = require('util');
var async = require('async');
var msRestAzure = require('@azure/ms-rest-nodeauth');
var ComputeManagementClient = require('@azure/arm-compute-profile-2019-03-01-hybrid').ComputeManagementClient;
var StorageManagementClient = require('@azure/arm-storage-profile-2019-03-01-hybrid').StorageManagementClient;
var NetworkManagementClient = require('@azure/arm-network-profile-2019-03-01-hybrid').NetworkManagementClient;
var ResourceManagementClient = require('@azure/arm-resources-profile-hybrid-2019-03-01').ResourceManagementClient;
const request = require('request');
const https = require('https');
const fetch = require("node-fetch");
const requestPromise = util.promisify(request);
var sleep = require('system-sleep');

_validateEnvironmentVariables();
var clientId = process.env['CLIENT_ID'];
var domain = process.env['DOMAIN'];
var secret = process.env['APPLICATION_SECRET'];
var subscriptionId = process.env['AZURE_SUBSCRIPTION_ID'];
var base_url = process.env['ARM_ENDPOINT'];
var tenantId = process.env['AZURE_TENANT_ID']; //"adfs"
var resourceClient, computeClient, storageClient, networkClient;
//Sample Config
var randomIds = {};
var location = 'westus2';
var accType = 'Standard_LRS';
var resourceGroupName = _generateRandomId('testrg', randomIds);
var vmName = _generateRandomId('testvm', randomIds);
var storageAccountName = _generateRandomId('testac', randomIds);
var vnetName = _generateRandomId('testvnet', randomIds);
var subnetName = _generateRandomId('testsubnet', randomIds);
var publicIPName = _generateRandomId('testpip', randomIds);
var networkInterfaceName = _generateRandomId('testnic', randomIds);
var ipConfigName = _generateRandomId('testcrpip', randomIds);
var domainNameLabel = _generateRandomId('testdomainname', randomIds);
var osDiskName = _generateRandomId('testosdisk', randomIds);

// Ubuntu config
var publisher = 'Canonical';
var offer = 'UbuntuServer';
var sku = '14.04.5-LTS';
var osType = 'Linux';

// Windows config
//var publisher = 'microsoftwindowsserver';
//var offer = 'windowsserver';
//var sku = '2012-r2-datacenter';
//var osType = 'Windows';

var adminUsername = 'notadmin';
var adminPassword = 'Pa$$w0rd92';


///////////////////////////////////////////
//     Entrypoint for sample script      //
///////////////////////////////////////////

// create a map
var map = {};
const fetchUrl = base_url + 'metadata/endpoints?api-version=1.0'

function initialize() {
  // Setting URL and headers for request
  var options = {
    url: fetchUrl,
    headers: {
      'User-Agent': 'request'
    },
    rejectUnauthorized: false
  };
  // Return new promise 
  return new Promise(function (resolve, reject) {
    // Do async job
    request.get(options, function (err, resp, body) {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(body));
      }
    })
  })

}

function main() {
  var initializePromise = initialize();
  initializePromise.then(function (result) {
    var userDetails = result;
    console.log("Initialized user details");
    // Use user details from here
    console.log(userDetails)
    map["name"] = "AzureStack"
    map["portalUrl"] = userDetails.portalEndpoint
    map["resourceManagerEndpointUrl"] = base_url
    map["galleryEndpointUrl"] = userDetails.galleryEndpoint
    map["activeDirectoryEndpointUrl"] = userDetails.authentication.loginEndpoint.slice(0, userDetails.authentication.loginEndpoint.lastIndexOf("/") + 1)
    map["activeDirectoryResourceId"] = userDetails.authentication.audiences[0]
    map["activeDirectoryGraphResourceId"] = userDetails.graphEndpoint
    map["storageEndpointSuffix"] = base_url.substring(base_url.indexOf('.'))
    map["keyVaultDnsSuffix"] = ".vault" + base_url.substring(base_url.indexOf('.'))
    map["managementEndpointUrl"] = userDetails.authentication.audiences[0]
    map["validateAuthority"] = "false"
    Environment.Environment.add(map);

    var tokenAudience = map["activeDirectoryResourceId"]

    var options = {};
    options["environment"] = Environment.Environment.AzureStack;
    options["tokenAudience"] = tokenAudience;

    ///////////////////////////////////////
    //Entrypoint for the sample script   //
    ///////////////////////////////////////
    msRestAzure.loginWithServicePrincipalSecret(clientId, secret, tenantId, options, function (err, credentials) {
        if (err) return console.log(err);
       
        var clientOptions = {};
        clientOptions["baseUri"] = base_url;
        resourceClient = new ResourceManagementClient(credentials, subscriptionId, clientOptions);
        computeClient = new ComputeManagementClient(credentials, subscriptionId, clientOptions);
        storageClient = new StorageManagementClient(credentials, subscriptionId, clientOptions);
        networkClient = new NetworkManagementClient(credentials, subscriptionId), clientOptions;

         ///////////////////////////////////////////////////////////////////////////////////
            //Task1: Create VM. This is a fairly complex task. Hence we have a wrapper method//
            //named createVM() that encapsulates the steps to create a VM. Other tasks are   //
            //fairly simple in comparison. Hence we don't have a wrapper method for them.    //
            ///////////////////////////////////////////////////////////////////////////////////
        async.series([
          function (callback) {
            console.log('\n>>>>>>>Start of Task1: Create a VM named: ' + vmName);
            createVM(function (err, result) {
              if (err) {
                console.log(util.format('\n???????Error in Task1: while creating a VM:\n%s',
                  util.inspect(err, { depth: null })));
                callback(err);
              } else {
                console.log(util.format('\n######End of Task1: Create a VM is succesful.\n%s',
                  util.inspect(result, { depth: null })));
                callback(null, result);
              }
            });
          },
          function (callback) {
            /////////////////////////////////////////////////////////
            //Task2: Get Information about the vm created in Task1.//
            /////////////////////////////////////////////////////////
            console.log('\n>>>>>>>Start of Task2: Get VM Info about VM: ' + vmName);
            computeClient.virtualMachines.get(resourceGroupName, vmName, function (err, result) {
              if (err) {
                console.log(util.format('\n???????Error in Task2: while getting the VM Info:\n%s',
                  util.inspect(err, { depth: null })));
                callback(err);
              } else {
                console.log(util.format('\n######End of Task2: Get VM Info is successful.\n%s',
                  util.inspect(result, { depth: null })));
                callback(null, result);
              }
            });
          },
          function (callback) {
            ///////////////////////////
            //Task3: Poweroff the VM.//
            ///////////////////////////
            console.log('\n>>>>>>>Start of Task3: Poweroff the VM: ' + vmName);
            computeClient.virtualMachines.powerOff(resourceGroupName, vmName, function (err, result) {
              if (err) {
                console.log(util.format('\n???????Error in Task3: while powering off the VM:\n%s',
                  util.inspect(err, { depth: null })));
                callback(err);
              } else {
                console.log(util.format('\n######End of Task3: Poweroff the VM is successful.\n%s',
                  util.inspect(result, { depth: null })));
                callback(null, result);
              }
            });
          },
          function (callback) {
            ////////////////////////
            //Task4: Start the VM.//
            ////////////////////////
            console.log('\n>>>>>>>Start of Task4: Start the VM: ' + vmName);
            computeClient.virtualMachines.start(resourceGroupName, vmName, function (err, result) {
              if (err) {
                console.log(util.format('\n???????Error in Task4: while starting the VM:\n%s',
                  util.inspect(err, { depth: null })));
                callback(err);
              } else {
                console.log(util.format('\n######End of Task4: Start the VM is successful.\n%s',
                  util.inspect(result, { depth: null })));
                callback(null, result);
              }
            });
          },
          
          function (callback) {
            //////////////////////////////////////////////////////
            //Task5: Listing All the VMs under the subscription.//
            //////////////////////////////////////////////////////
            console.log('\n>>>>>>>Start of Task5: List all vms under the current subscription.');
            computeClient.virtualMachines.listAll(function (err, result) {
              if (err) {
                console.log(util.format('\n???????Error in Task5: while listing all the vms under ' +
                  'the current subscription:\n%s', util.inspect(err, { depth: null })));
                callback(err);
              } else {
                console.log(util.format('\n######End of Task5: List all the vms under the current ' +
                  'subscription is successful.\n%s', util.inspect(result, { depth: null })));
                callback(null, result);
              }
            });
          }
        ],
          //final callback to be run after all the tasks
          function (err, results) {
            if (err) {
              console.log(util.format('\n??????Error occurred in one of the operations.\n%s',
                util.inspect(err, { depth: null })));
            } else {
              console.log(util.format('\n######All the operations have completed successfully. ' +
                'The final set of results are as follows:\n%s', util.inspect(results, { depth: null })));
              console.log(util.format('\n\n-->Please execute the following script for cleanup:\nnode cleanup.js %s %s', resourceGroupName, vmName));
            }
          console.log('\n###### Exit ######');
          process.exit();
          });
      });
    },
    
    function (err) {
      console.log(err);
    })
  }
main();

    // Helper functions
    function createVM(finalCallback) {
      //We could have had an async.series over here as well. However, we chose to nest
      //the callbacks to showacase a different pattern in the sample.
      createResourceGroup(function (err, result) {
        if (err) return finalCallback(err);
        createStorageAccount(function (err, accountInfo) {
          if (err) return finalCallback(err);
          createVnet(function (err, vnetInfo) {
            if (err) return finalCallback(err);
            console.log('\nCreated vnet:\n' + util.inspect(vnetInfo, { depth: null }));
            getSubnetInfo(function (err, subnetInfo) {
              if (err) return finalCallback(err);
              console.log('\nFound subnet:\n' + util.inspect(subnetInfo, { depth: null }));
              createPublicIP(function (err, publicIPInfo) {
                if (err) return finalCallback(err);
                console.log('\nCreated public IP:\n' + util.inspect(publicIPInfo, { depth: null }));
                createNIC(subnetInfo, publicIPInfo, function (err, nicInfo) {
                  if (err) return finalCallback(err);
                  console.log('\nCreated Network Interface:\n' + util.inspect(nicInfo, { depth: null }));
                  findVMImage(function (err, vmImageInfo) {
                    if (err) return finalCallback(err);
                    console.log('\nFound Vm Image:\n' + util.inspect(vmImageInfo, { depth: null }));
                    getNICInfo(function (err, nicResult) {
                      if (err) {
                        console.log('Could not get the created NIC: ' + networkInterfaceName + util.inspect(err, { depth: null }));
                      } else {
                        console.log('Found the created NIC: \n' + util.inspect(nicResult, { depth: null }));
                      }
                      createVirtualMachine(nicInfo.id, vmImageInfo[0].name, function (err, vmInfo) {
                        if (err) return finalCallback(err);
                        return finalCallback(null, vmInfo);
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    }

    function createResourceGroup(callback) {
      var groupParameters = { location: location, tags: { sampletag: 'sampleValue' } };
      console.log('\n1.Creating resource group: ' + resourceGroupName);
      return resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, callback);
    }

    function createStorageAccount(callback) {
      var createParameters = {
        location: location,
        sku: {
          name: accType,
        },
        kind: 'Storage',
        tags: {
          tag1: 'val1',
          tag2: 'val2'
        }
      };
      console.log('\n2.Creating storage account: ' + storageAccountName+ util.inspect(createParameters));
      return storageClient.storageAccounts.create(resourceGroupName, storageAccountName, createParameters, callback);
    }

    function createVnet(callback) {
      var vnetParameters = {
        location: location,
        addressSpace: {
          addressPrefixes: ['10.0.0.0/16']
        },
        dhcpOptions: {
          dnsServers: ['10.1.1.1', '10.1.2.4']
        },
        subnets: [{ name: subnetName, addressPrefix: '10.0.0.0/24' }],
      };
      console.log('\n3.Creating vnet: ' + vnetName);
      return networkClient.virtualNetworks.createOrUpdate(resourceGroupName, vnetName, vnetParameters, callback);
    }

    
    function getSubnetInfo(callback) {
      console.log('\nGetting subnet info for: ' + subnetName);
      sleep(10000);
      return networkClient.subnets.get(resourceGroupName, vnetName, subnetName, callback);
    }

    function createPublicIP(callback) {
      var publicIPParameters = {
        location: location,
        publicIPAllocationMethod: 'Dynamic',
        dnsSettings: {
          domainNameLabel: domainNameLabel
        }
      };
      console.log('\n4.Creating public IP: ' + publicIPName);
      return networkClient.publicIPAddresses.createOrUpdate(resourceGroupName, publicIPName, publicIPParameters, callback);
    }

    function createNIC(subnetInfo, publicIPInfo, callback) {
      var nicParameters = {
        location: location,
        ipConfigurations: [
          {
            name: ipConfigName,
            privateIPAllocationMethod: 'Dynamic',
            subnet: subnetInfo,
            publicIPAddress: publicIPInfo
          }
        ]
      };
      console.log('\n5.Creating Network Interface: ' + networkInterfaceName);
      return networkClient.networkInterfaces.createOrUpdate(resourceGroupName, networkInterfaceName, nicParameters, callback);
    }

    function findVMImage(callback) {
      console.log(util.format('\nFinding a VM Image for location %s from ' +
        'publisher %s with offer %s and sku %s', location, publisher, offer, sku));
      return computeClient.virtualMachineImages.list(location, publisher, offer, sku, { top: 1 }, callback);
    }

    function getNICInfo(callback) {
      return networkClient.networkInterfaces.get(resourceGroupName, networkInterfaceName, callback);
    }
    function createVirtualMachine(nicId, vmImageVersionNumber, callback) {
      var vmParameters = {
        location: location,
        osProfile: {
          computerName: vmName,
          adminUsername: adminUsername,
          adminPassword: adminPassword
        },
        hardwareProfile: {
          vmSize: 'Basic_A0'
        },
        storageProfile: {
          imageReference: {
            publisher: publisher,
            offer: offer,
            sku: sku,
            version: vmImageVersionNumber
          },
          osDisk: {
            name: osDiskName,
            caching: 'None',
            createOption: 'fromImage',
            vhd: { uri: 'https://' + storageAccountName + '.blob' +map["storageEndpointSuffix"]+'vhds/'+osDiskName+'.vhd' }
          },
        },
        networkProfile: {
          networkInterfaces: [
            {
              id: nicId,
              primary: true
            }
          ]
        }
      };
      console.log('\n6.Creating Virtual Machine: ' + vmName);
      console.log('\n VM create parameters: ' + util.inspect(vmParameters, { depth: null }));
      computeClient.virtualMachines.createOrUpdate(resourceGroupName, vmName, vmParameters, callback);
    }

    function _validateEnvironmentVariables() {
      var envs = [];
      if (!process.env['CLIENT_ID']) envs.push('CLIENT_ID');
      if (!process.env['ARM_ENDPOINT']) envs.push('ARM_ENDPOINT');
      if (!process.env['APPLICATION_SECRET']) envs.push('APPLICATION_SECRET');
      if (!process.env['AZURE_SUBSCRIPTION_ID']) envs.push('AZURE_SUBSCRIPTION_ID');
      if (!process.env['DOMAIN']) envs.push('DOMAIN');
      if (!process.env['TENANT_ID']) envs.push('TENANT_ID');
      if (envs.length > 0) {
        throw new Error(util.format('please set/export the following environment variables: %s', envs.toString()));
      }
    }
    function _generateRandomId(prefix, exsitIds) {
      var newNumber;
      while (true) {
        newNumber = prefix + Math.floor(Math.random() * 10000);
        if (!exsitIds || !(newNumber in exsitIds)) {
          break;
        }
      }
      return newNumber;
    }