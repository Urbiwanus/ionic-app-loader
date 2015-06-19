angular.module('starter.services', [])

        .factory('UpdateService', ['$log', 'ConfigService', '$q', function ($log, ConfigService, $q) {
            var fs = new CordovaPromiseFS({
                Promise: Promise
            });
        
            var loader = new CordovaAppLoader({
                fs: fs,
                serverRoot: 'http://'+ConfigService.getHost()+':'+ConfigService.getPort(),
                localRoot: 'app',
                cacheBuster: true, // make sure we're not downloading cached files.
                checkTimeout: 10000, // timeout for the "check" function - when you loose internet connection
                mode: 'mirror',
                manifest: 'manifest.json' + "?" + Date.now()
            });
            var service = {
                // Check for new updates on js and css files
                check: function () {
        
                    var defer = $q.defer();
                    loader.check().then(function (updateAvailable) {
                        console.log("Update available:");
                        if (updateAvailable) {
                            defer.resolve(updateAvailable);
                        }
                        else {
                            defer.reject(updateAvailable);
                        }
                    });
        
                    return defer.promise;
                },
                // Download new js/css files 
                download: function (onprogress) {
                    var defer = $q.defer();
        
                    loader.download(onprogress).then(function (manifest) {
                        console.log("Download active!");
                        defer.resolve(manifest);
                    }, function (error) {
                        console.log("Download Error:");
                        defer.reject(error);
                    });
                    return defer.promise;
                },
                // Update the local files with a new version just downloaded
                update: function (reload) {
                    console.log("update files--------------");
                    return loader.update(reload);
                },
                // Check wether the HTML file is cached
                isFileCached: function (file) {
                    if (angular.isDefined(loader.cache)) {
                        return loader.cache.isCached(file);
                    }
                    return false;
                },
                // returns the cached HTML file as a url for HTTP interceptor
                getCachedUrl : function (url) {
                    if(angular.isDefined(loader.cache)) {
                        return loader.cache.get(url);
                    }
                    return url;
                }
            };
        
            return service;
        }])
        
        .factory('ConfigService', [function() {
            var hostURL = "192.168.3.163";
            var hostPort = 8080;
            
            var service = {
                getHost : function () {
                    return hostURL;
                },
            
                getPort : function () {
                    return hostPort;
                }
            }
            return service;
        }]);
        