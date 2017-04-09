module.exports.getDockerSecret = function(envVar, callback) {
  try {
    const loginReader = require('readline').createInterface({
      input: require('fs').createReadStream(envVar)
    });
    loginReader.on('line', callback);
  } catch (e) {
    console.error(e);
  }
}
