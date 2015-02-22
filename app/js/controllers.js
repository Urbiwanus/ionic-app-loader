angular.module('starter.controllers', [])

        .controller('AppCtrl', ['$scope', '$ionicModal', '$timeout', '$q', function ($scope, $ionicModal, $timeout, $q) {
                // Form data for the login modal
                $scope.loginData = {};
                // Create the login modal that we will use later
                $ionicModal.fromTemplateUrl('templates/login.html', {
                    scope: $scope
                }).then(function (modal) {
                    $scope.modal = modal;
                });
                // Triggered in the login modal to close it
                $scope.closeLogin = function () {
                    $scope.modal.hide();
                };
                // Open the login modal
                $scope.login = function () {
                    $scope.modal.show();
                };
                // Perform the login action when the user submits the login form
                $scope.doLogin = function () {
                    console.log('Doing login', $scope.loginData);
                    // Simulate a login delay. Remove this and replace with your login
                    // code if using a login system
                    $timeout(function () {
                        $scope.closeLogin();
                    }, 1000);
                };
                $scope.checkUpdate = function () {
                    var fs = new CordovaPromiseFS({
                        Promise: $q
                    });
                    // Initialize a CordovaAppLoader
                    var loader = new CordovaAppLoader({
                        fs: fs,
                        serverRoot: 'http://192.168.188.46:8080/',
                        localRoot: 'app',
                        cacheBuster: true, // make sure we're not downloading cached files.
                        checkTimeout: 10000 // timeout for the "check" function - when you loose internet connection
                    });
                    loader.check().then(function (updateAvailable) {
                        console.log(updateAvailable);
                        if (updateAvailable)
                        {
                            loader.download(onprogress)
                                    .then(
                                            function (manifest)
                                            {
                                                console.log(manifest);
                                                loader.update();
                                            },
                                            function (failedDownloadUrlArray)
                                            {
                                                console.log(failedDownloadUrlArray);
                                            }
                                    )
                        }
                    });
                }
            }
        ])

        .controller('PlaylistsCtrl', ['$scope', function ($scope) {
                $scope.playlists = [
                    {title: 'Reggae2', id: 1},
                    {title: 'Chill3', id: 2},
                    {title: 'Dubstepfdsfd', id: 3},
                    {title: 'Indie', id: 4},
                    {title: 'Rap', id: 5},
                    {title: 'Cowbell', id: 6}
                ];
            }])

        .controller('PlaylistCtrl', ['$scope', '$stateParams', function ($scope, $stateParams) {
            }]);
