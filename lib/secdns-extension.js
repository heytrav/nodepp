function SecDnsExtension() {
}

SecDnsExtension.prototype.processKeyData = function(keyData) {
  var processedKeyData = {
    "secDNS:flags": keyData.flags,
    "secDNS:protocol": keyData.protocol,
    "secDNS:alg": keyData.alg,
    "secDNS:pubKey": keyData.pubKey
  };
  return processedKeyData;
};

SecDnsExtension.prototype.processDsData = function(dsData) {
  var processedDsData = {
    "secDNS:keyTag": dsData.keyTag,
    "secDNS:alg": dsData.alg,
    "secDNS:digestType": dsData.digestType,
    "secDNS:digest": dsData.digest
  };
  if (dsData.keyData)
    processedDsData['secDNS:keyData'] = this.processKeyData(dsData.keyData);
  return processedDsData;
};

SecDnsExtension.prototype.processSecDns = function(data) {
  var secDns = {};
  if (data.dsData) {
    var dsData = data.dsData;
    if (data.maxSigLife)
      secDns["secDNS:maxSigLife"] = data.maxSigLife;
    var processedDsData = SecDnsExtension.prototype.processDsData(dsData);
    secDns["secDNS:dsData"] = processedDsData;
  } else if (data.keyData) {
    var keyData = data.keyData;
    var processedKeyData = SecDnsExtension.prototype.processKeyData(keyData);
    secDns["secDNS:keyData"] = processedKeyData;
  }
  return secDns;
};

/*
 * Process DNSSEC data for a createDomain command
 * */

SecDnsExtension.prototype.createDomainSecDnsExtension = function(data) {
  var config = this.config;
  var namespace = config.namespaces.DNSSEC.xmlns;
  var secCreate = {
    "_attr": {
      "xmlns:secDNS": namespace
    }
  };
  if (data.dsData || data.keyData) {
    var processedSecDns = SecDnsExtension.prototype.processSecDns(data);
    for (var key in processedSecDns)
      secCreate[key] = processedSecDns[key];
  } else {
    return;
  }
  var processedExtension = {
    'secDNS:create': secCreate
  };

  return processedExtension;
};

SecDnsExtension.prototype.updateDomainSecDnsExtension = function(data) {
  var config = this.config;
  var namespace = config.namespaces.DNSSEC.xmlns;
  var change = data.chg;
  var add = data.add;
  var rem = data.rem;
  var updateSecDns = {
    "_attr": {
      "xmlns:secDNS": namespace
    }
  };
  if (!(change || add || rem))
    throw new Error("At least one 'chg', 'add', or 'rem' required in DNSSEC updates.");
  var actions = ["add", "rem"];
  for (var i in actions) {
    var action = actions[i];
    var actionSet = data[action];
    if (actionSet) {
      var actionKey = ['secDNS', action].join(':');
      var actionData = {};
      if (action === 'rem' && actionSet.all !== undefined) {
        // Make sure that "all" is a boolean, but accept numbers in
        // case someone wants to send 0|1
        var all = actionSet.all;
        if (typeof (all) === "number") {
          all = true;
          if (all <= 0)
            all = false;
        } else if (typeof (all) !== "boolean")
          throw new Error("'all' must be a boolean or truthy number.");
        actionData["secDNS:all"] = all.toString();
        updateSecDns[actionKey] = actionData;
        continue;
      }
      if (actionSet.dsData || actionSet.keyData) {
        var processedSecDns = SecDnsExtension.prototype.processSecDns(actionSet);
        for (var key in processedSecDns)
          actionData[key] = processedSecDns[key];
      }
      updateSecDns[actionKey] = actionData;
    }
  }
  if (change) {
    var changeSecDns = {};
    if (change.maxSigLife)
      changeSecDns["secDNS:maxSigLife"] = change.maxSigLife;
    updateSecDns["secDNS:chg"] = changeSecDns;
  }
  var processedExtension = {
    'secDNS:update': updateSecDns
  };
  return processedExtension;

};

/*
 * Map generic epp function to extension equivalent.
 * */

SecDnsExtension.mixinMapper = function(destObj) {
  var commandMapping = [{
    "createDomain": "createDomainSecDnsExtension",
    "updateDomain": "updateDomainSecDnsExtension",
  }];
  return commandMapping;
};

module.exports = SecDnsExtension;

