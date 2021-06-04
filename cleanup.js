/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */
"use strict";

var Environment = require("@azure/ms-rest-azure-env");
var util = require("util");
var msRestAzure = require("@azure/ms-rest-nodeauth");
var ResourceManagementClient = require("@azure/arm-resources-profile-2020-09-01-hybrid").ResourceManagementClient;
var ComputeManagementClient = require("@azure/arm-compute-profile-2020-09-01-hybrid").ComputeManagementClient;
const request = require("request");

const clientIdEnvName = "AZURE_SP_APP_ID";
const secretEnvName  = "AZURE_SP_APP_SECRET";
const subscriptionIdEnvName  = "AZURE_SUBSCRIPTION_ID";
const tenantIdEnvName  = "AZURE_TENANT_ID";
const armEndpointEnvName = "AZURE_ARM_ENDPOINT";

_validateEnvironmentVariables();
_validateParameters();

var clientId = process.env[clientIdEnvName];
var tenantId = process.env[tenantIdEnvName];
var secret = process.env[secretEnvName];
var subscriptionId = process.env[subscriptionIdEnvName];
var armEndpoint = process.env[armEndpointEnvName];
var resourceGroupName = process.argv[2];
var vmName = process.argv[3];
var resourceClient, computeClient;
var map = {};

const fetchUrl = armEndpoint + "metadata/endpoints?api-version=2019-10-01";

function deleteVirtualMachine(callback) {
  console.log("\nStarting to delete virtualMachine: " + vmName);
  return computeClient.virtualMachines.deleteMethod(resourceGroupName, vmName, callback);
}

function deleteResourceGroup(callback) {
  console.log("\nStarting to delete resource group: " + resourceGroupName);
  return resourceClient.resourceGroups.deleteMethod(resourceGroupName, callback);
}

function _validateEnvironmentVariables() {
  var envs = [];
  if (!process.env[clientIdEnvName]) envs.push(clientIdEnvName);
  if (!process.env[tenantIdEnvName]) envs.push(tenantIdEnvName);
  if (!process.env[secretEnvName]) envs.push(secretEnvName);
  if (!process.env[subscriptionIdEnvName]) envs.push(subscriptionIdEnvName);
  if (envs.length > 0) {
    throw new Error(util.format("please set/export the following environment variables: %s", envs.toString()));
  }
}

function _validateParameters() {
  if (!process.argv[2] || !process.argv[3]) {
    throw new Error("Please provide the resource group and the virtual machine name by executing the script as follows: \"node cleanup.js <resourceGroupName> <vmName>\".");
  }
}

function fetchEndpointMetadata() {
  // Setting URL and headers for request
  var options = {
    url: fetchUrl,
    headers: {
      "User-Agent": "request"
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
    });
  });
}

function main() {
  var endpointData = fetchEndpointMetadata();
  endpointData.then(function (result) {
    var metadata = result[0];
    console.log("Initialized user details");
    console.log(metadata);
    map["name"] = "AzureStack";
    map["portalUrl"] = metadata.portal;
    map["resourceManagerEndpointUrl"] = armEndpoint;
    map["galleryEndpointUrl"] = metadata.gallery;
    map["activeDirectoryEndpointUrl"] = metadata.authentication.loginEndpoint.slice(0, metadata.authentication.loginEndpoint.lastIndexOf("/") + 1) ;
    map["activeDirectoryResourceId"] = metadata.authentication.audiences[0];
    map["activeDirectoryGraphResourceId"] = metadata.graph;
    map["storageEndpointSuffix"] = metadata.suffixes.storage;
    map["keyVaultDnsSuffix"] = metadata.suffixes.keyVaultDns;
    map["managementEndpointUrl"] = metadata.authentication.audiences[0] ;
    var isAdfs = metadata.authentication.loginEndpoint.endsWith("adfs") || metadata.authentication.loginEndpoint.endsWith("adfs/");
    Environment.Environment.add(map);

    var options = {};
    options["environment"] = Environment.Environment.AzureStack;

    if(isAdfs) {
        tenantId = "adfs";
        options.environment.validateAuthority = false;
        map["validateAuthority"] = false;
    }

    msRestAzure.loginWithServicePrincipalSecret(clientId, secret, tenantId, options, function (err, credentials) {
      if (err) return console.log(err);

      resourceClient = new ResourceManagementClient(credentials, subscriptionId);
      computeClient = new ComputeManagementClient(credentials, subscriptionId);

      deleteVirtualMachine(function (err, result) {
        if (err) return console.log("Error occured in deleting the virtual machine: " + vmName + "\n" + util.inspect(err, { depth: null }));
        console.log("Deleting virtual machine: " + vmName);
        deleteResourceGroup(function (err, result) {
          if (err) return console.log("Error occured in deleting the resource group: " + resourceGroupName + "\n" + util.inspect(err, { depth: null }));
          console.log("Deleting resource group: " + resourceGroupName);
        });
      });
    });
  }, function (err) {
    console.log(err);
  });
}

main();