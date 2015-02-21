var CordovaFileCache = require('cordova-file-cache');
var CordovaPromiseFS = require('cordova-promise-fs');
var Promise = null;

var BUNDLE_ROOT = location.href.replace(location.hash,'');
BUNDLE_ROOT = BUNDLE_ROOT.substr(0,BUNDLE_ROOT.lastIndexOf('/')+1);
if(/ip(hone|ad|od)/i.test(navigator.userAgent)){
  BUNDLE_ROOT = location.pathname.substr(location.pathname.indexOf('/www/'));
  BUNDLE_ROOT = BUNDLE_ROOT.substr(0,BUNDLE_ROOT.lastIndexOf('/')+1);
  BUNDLE_ROOT = 'cdvfile://localhost/bundle' + BUNDLE_ROOT;
}

function AppLoader(options){
  if(!options) throw new Error('CordovaAppLoader has no options!');
  if(!options.fs) throw new Error('CordovaAppLoader has no "fs" option (cordova-promise-fs)');
  if(!options.serverRoot) throw new Error('CordovaAppLoader has no "serverRoot" option.');
  if(!window.pegasus || !window.Manifest) throw new Error('CordovaAppLoader bootstrap.js is missing.');
  this.allowServerRootFromManifest = options.allowServerRootFromManifest === true;
  Promise = options.fs.Promise;

  // initialize variables
  this.manifest = window.Manifest;
  this.newManifest = null;
  this.bundledManifest = null;
  this._lastUpdateFiles = localStorage.getItem('last_update_files');

  // normalize serverRoot and set remote manifest url
  options.serverRoot = options.serverRoot || '';
  if(!!options.serverRoot && options.serverRoot[options.serverRoot.length-1] !== '/') options.serverRoot += '/';
  this.newManifestUrl = options.manifestUrl || options.serverRoot + (options.manifest || 'manifest.json');

  // initialize a file cache
  if(options.mode) options.mode = 'mirror';
  this.cache = new CordovaFileCache(options);

  // private stuff
  this.corruptNewManifest = false;
  this._toBeCopied = [];
  this._toBeDeleted = [];
  this._toBeDownloaded = [];
  this._updateReady = false;
  this._checkTimeout = options.checkTimeout || 10000;
}

AppLoader.prototype._createFilemap = function(files){
  var result = {};
  var normalize = this.cache._fs.normalize;
  Object.keys(files).forEach(function(key){
    files[key].filename = normalize(files[key].filename);
    result[files[key].filename] = files[key];
  });
  return result;
};

AppLoader.prototype.copyFromBundle = function(file){
  var url = BUNDLE_ROOT + file;
  return this.cache._fs.download(url,this.cache.localRoot + file);
};

AppLoader.prototype.getBundledManifest = function(){
  var self = this;
  var bootstrapScript = document.querySelector('script[manifest]');
  var bundledManifestUrl = (bootstrapScript? bootstrapScript.getAttribute('manifest'): null) || 'manifest.json';

  return new Promise(function(resolve,reject){
    if(self.bundledManifest) {
      resolve(self.bundledManifest);
    } else {
      pegasus(bundledManifestUrl).then(function(bundledManifest){
        self.bundledManifest = bundledManifest;
        resolve(bundledManifest);
      },reject);
      setTimeout(function(){reject(new Error('bundled manifest timeout'));},self._checkTimeout);
    }
  });
};


AppLoader.prototype.check = function(newManifest){
  var self = this, manifest = this.manifest;
  if(typeof newManifest === "string") {
    self.newManifestUrl = newManifest;
    newManifest = undefined;
  }

  var gotNewManifest = new Promise(function(resolve,reject){
    if(typeof newManifest === "object") {
      resolve(newManifest);
    } else {
      pegasus(self.newManifestUrl).then(resolve,reject);
      setTimeout(function(){reject(new Error('new manifest timeout'));},self._checkTimeout);
    }
  });

  return new Promise(function(resolve,reject){
    Promise.all([gotNewManifest,self.getBundledManifest(),self.cache.list()])
      .then(function(values){
        var newManifest = values[0];
        var bundledManifest = values[1];

        // Prevent end-less update loop, check if new manifest
        // has been downloaded before (but failes)
        if(JSON.stringify(newManifest.files) === self._lastUpdateFiles) {
          if(JSON.stringify(newManifest.files) !== JSON.stringify(Manifest.files)){
            console.warn('New manifest available, but an earlier update attempt failed. Will not download.');
            self.corruptNewManifest = true;
            resolve(null);
          }
          resolve(false);
          return;
        }

        // Check if new manifest is valid
        if(!newManifest.files){
          reject('Downloaded Manifest has no "files" attribute.');
          return;
        }

        // We're good to go check! Get all the files we need
        var cachedFiles = values[2]; // files in cache
        var oldFiles = self._createFilemap(manifest.files); // files in current manifest
        var newFiles = self._createFilemap(newManifest.files); // files in new manifest
        var bundledFiles = self._createFilemap(bundledManifest.files); // files in app bundle

        // Create COPY and DOWNLOAD lists
        self._toBeDownloaded = [];
        self._toBeCopied = [];
        self._toBeDeleted= [];
        var isCordova = self.cache._fs.isCordova;
        Object.keys(newFiles)
          // Find files that have changed version or are missing
          .filter(function(file){
                    // if new file, or...
            return !oldFiles[file] ||
                    // version has changed, or...
                    oldFiles[file].version !== newFiles[file].version ||
                    // not in cache for some reason
                    !self.cache.isCached(file);
          })
          // Add them to the correct list
          .forEach(function(file){
            // bundled version matches new version, so we can copy!
            if(isCordova && bundledFiles[file] && bundledFiles[file].version === newFiles[file].version){
              self._toBeCopied.push(file);
            // othwerwise, we must download
            } else {
              self._toBeDownloaded.push(file);
            }
          });

        // Delete files
        self._toBeDeleted = cachedFiles
          .map(function(file){
            return file.substr(self.cache.localRoot.length);
          })
          .filter(function(file){
                  // Everything that is not in new manifest, or....
            return !newFiles[file] ||
                  // Files that will be downloaded, or...
                   self._toBeDownloaded.indexOf(file) >= 0 ||
                  // Files that will be copied
                   self._toBeCopied.indexOf(file) >= 0;
          });


        var changes = self._toBeDeleted.length + self._toBeDownloaded.length;
        // Note: if we only need to copy files, we can keep serving from bundle!
        // So no update is needed!
        if(changes > 0){
          // Save the new Manifest
          self.newManifest = newManifest;
          self.newManifest.root = self.cache.localInternalURL;
          resolve(true);
        } else {
          resolve(false);
        }
      }); // end of .then
  }); // end of new Promise
};

AppLoader.prototype.canDownload = function(){
  return !!this.newManifest && !this._updateReady;
};

AppLoader.prototype.canUpdate = function(){
  return this._updateReady;
};

AppLoader.prototype.download = function(onprogress){
  var self = this;
  if(!self.canDownload()) {
    return Promise.resolve(null);
  }
  // we will delete files, which will invalidate the current manifest...
  localStorage.removeItem('manifest');
  // only attempt this once - set 'last_update_files'
  localStorage.setItem('last_update_files',JSON.stringify(this.newManifest.files));
  this.manifest.files = Manifest.files = {};
  return self.cache.remove(self._toBeDeleted,true)
    .then(function(){
      return Promise.all(self._toBeCopied.map(function(file){
        return self.cache._fs.download(BUNDLE_ROOT + file,self.cache.localRoot + file);
      }));
    })
    .then(function(){
      if(self.allowServerRootFromManifest && self.newManifest.serverRoot){
        self.cache.serverRoot = self.newManifest.serverRoot;
      }
      self.cache.add(self._toBeDownloaded);
      return self.cache.download(onprogress);
    }).then(function(){
      self._toBeDeleted = [];
      self._toBeDownloaded = [];
      self._updateReady = true;
      return self.newManifest;
    },function(files){
      // on download error, remove files...
      if(!!files && files.length){
        self.cache.remove(files);
      }
      return files;
    });
};

AppLoader.prototype.update = function(reload){
  if(this._updateReady) {
    // update manifest
    localStorage.setItem('manifest',JSON.stringify(this.newManifest));
    if(reload !== false) location.reload();
    return true;
  }
  return false;
};

AppLoader.prototype.clear = function(){
  localStorage.removeItem('last_update_files');
  localStorage.removeItem('manifest');
  return this.cache.clear();
};

AppLoader.prototype.reset = function(){
  return this.clear().then(function(){
    location.reload();
  },function(){
    location.reload();
  });
};

module.exports = AppLoader;