const fs = require('fs')
const {promisify} = require('util')

/**
 * Timer class
 */
class Timer{
  constructor() {
    this.times = {}
  }

  start(id) {
    this.times[id] = process.hrtime()
  }

  getTime (id) {
    if(!this.times[id]) 
      throw new Error('invalid id')


    let hrtime = process.hrtime(this.times[id])
    const precision = 3; // 3 decimal places
    let elapsed = hrtime[1] / 1000000; // divide by a million to get nano to milli

    return [hrtime[0], elapsed.toFixed(precision)]
  }
}

/**
 * Check if it an object
 * @param {*} o 
 */
function isObject(o) {
  return o instanceof Object && o.constructor === Object
}


/*
* Recursively merge properties of two objects
*/
function assignRecursive(obj1, obj2) {
  for (const p in obj2) {
    try {
      // Property in destination object set; update its value.
      if (obj2[p].constructor == Object) {
        if (!obj1[p]) obj1[p] = {}
        obj1[p] = assignRecursive(obj1[p], obj2[p])
      } else {
        obj1[p] = obj2[p]
      }
    } catch(e) {
      // Property in destination object not set; create it and set its value.
      obj1[p] = obj2[p]
    }
  }
  return obj1
}

/**
 * object -> Array
 * promise all
 * Array -> object
 * @param {*} object 
 */
let objectPromises = async (object) => {
  //object -> Array
  const promises = []
  for (const key in object) {
    promises.push(object[key])
  }

  return Promise.all(promises).then((result) => {
    //Array -> object
    const resultObject = {}
    let i = 0
    for (const key in object) {
      resultObject[key] = result[i]
      i++
    }
    return resultObject
  }).catch((e) => {
    throw new Error(e)
  })
}

/**
 * Async map can return Array or object
 * 
 * @param {Array} array Input array 
 * @param {function} callback Function called on each item
 * @param {boolean} object Flag if return object or array
 * 
 * @return {Array|Object} 
 */
function asyncMap (array, callback, object = false) {
  let promises = []
  for (const key in array) {
    /**
     * call the callback and push the promise  
     */
    promises.push(callback(array[key], key, array))
  }

  return Promise.all(promises).then(async (result) => {
    //init result var
    const ouput = []
    let promises = []
    let keys = []
    for (const key in result) {
      if (result[key] === null || result[key] === undefined) continue
      if (object) {
        if (result[key].value === null || result[key] === undefined) continue

        keys.push(result[key].key)
        promises.push(result[key].value)
      } else {
        ouput.push(result[key])
      }
    }

    if (!object) {
      return ouput
    } else {
      return Promise.all(promises).then(async (result) => {
        const output = {}
        for (const key in result) {
          if (result[key] === null || result[key] === undefined) continue
          output[keys[key]] = result[key]
        }

        return output
      })
    }
  })
}

/*!
 * lstat | MIT (c) Shinnosuke Watanabe
 * https://github.com/shinnn/lstat
*/
const fsLstat = require('fs').lstat;
const {inspect} = require('util');

function asyncLstat(...args) {
  const argLen = args.length;

  return new Promise((resolve, reject) => {
    if (argLen !== 1) {
      throw new TypeError(`Expected 1 argument (string), but got ${
        argLen === 0 ? 'no' : argLen
      } arguments instead.`);
    }

    const [path] = args;

    if (typeof path !== 'string') {
      throw new TypeError(`Expected a file path (string), but got a non-string value ${inspect(path)}.`);
    }

    if (path.length === 0) {
      throw new Error('Expected a file path, but got \'\' (empty string).');
    }

    fsLstat(path, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(result);
    });
  });
};

/**
 * Read object propertie by string path
 * @param {*} o 
 * @param {*} s 
 */
const objectByString = function(o, s) {
  s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
  s = s.replace(/^\./, '');           // strip a leading dot
  var a = s.split('.');
  for (var i = 0, n = a.length; i < n; ++i) {
    var k = a[i];
    if (o && k in o) {
      o = o[k]
    } else {
      return null
    }
  }
  return o;
}

function _asyncAccess(filepath, mode) {
  return new Promise((resolve, reject) => {
    fs.access(filepath, mode, error => {
      resolve(!error);
    })
  })
}

/**
 * Async file exists
 * 
 * @param {*} filepath 
 */
const asyncFileExists = function (filepath) {
  return _asyncAccess(filepath, fs.F_OK)
}

/**
 * Async file exists
 * 
 * @param {*} filepath 
 */
const asyncIsWritable = function (filepath) {
  return _asyncAccess(filepath, fs.W_OK)
}

/**
 * async rmdir recurise
 * @param {*} path 
 */
function asyncRmDir (path) {
  //check dir exists
  return asyncFileExists(path).then((exists) => {
    if (exists) {
      //readdir 
      return promisify(fs.readdir)(path).then((dir) => {
        //list dir async
        return asyncMap(dir, async (file) => {
          let curPath = path + '/' + file
          //check if dir or file
          return asyncLstat(curPath).then((stat) => {
            //if is dir rm it
            if (stat.isDirectory()) {
              return asyncRmDir(curPath)
            } else {
              //if file unlink
              return promisify(fs.unlink)(curPath)
            }
          })
        })
      //then all subs are delete
      }).then(() => {
        //rm dir
        return promisify(fs.rmdir)(path).then(() => {
          return true
        })
      })
    } else {
      return false
    }
  })
}

//promisify mkdirSync
function asyncMkdir(...args) {
  return promisify(fs.mkdirSync)(...args)
}


//require() Promise
function asyncRequire(path) {
  return new Promise((resolve, reject) => {
    try {
      resolve(require(path))
    } catch (error) {
      reject(error)
    }
  })
}

//require.resolve() Promise
function asyncRequireResolve(path) {
  return new Promise((resolve, reject) => {
    try {
      resolve(require.resolve(path))
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = {
  assignRecursive,
  objectPromises,
  asyncMap,
  timer: new Timer,
  isObject, 
  objectByString,
  asyncFileExists,
  asyncIsWritable,
  asyncLstat,
  asyncRmDir,
  asyncMkdir: promisify(fs.mkdir),
  asyncStat: promisify(fs.stat),
  asyncReaddir: promisify(fs.readdir),
  asyncWriteFile: promisify(fs.writeFile),
  asyncReadFile: promisify(fs.readFile),
  asyncRequire,
  asyncRequireResolve
}
