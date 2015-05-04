angular.module('starter.controllers', [])

        .controller('AppCtrl', ['$scope', '$ionicModal', '$timeout', '$q', 'UpdateService',  function ($scope, $ionicModal, $timeout, $q, UpdateService) {
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
                    var check = UpdateService.check();
                    check.
                        then(function(result) {
                            if(result === true) {
                                console.log('update available');
                                var download = UpdateService.download();
                                    download.then(
                                        function(manifest) {
                                            console.log('manifest.....:');
                                            console.log(JSON.stringify(manifest));
                                            UpdateService.update();
                                        },
                                        function(error) {
                                            console.log('error....: ');
                                            console.log(JSON.stringify(error));
                                        }
                                    );  
                            } else {
                                console.log('not update available');
                            }
                        },
                        function(error){
                            console.log('no update available');
                            console.log(JSON.stringify(error));
                        });
                }
            }
        ])

        .controller('PlaylistsCtrl', ['$scope', function ($scope) {
                $scope.playlists = [
                    {title: 'Reggae2', id: 1},
                    {title: 'Chill3', id: 2},
                    {title: 'Dubstep', id: 3},
                    {title: 'Indie', id: 4},
                    {title: 'Rap', id: 5},
                    {title: 'Cowbell', id: 6},
                    {title: 'Techno', id: 7},
                    {title: 'Swing', id: 8},
                    {title: 'Jazz', id: 9},
                    {title: 'Hip Hop', id: 10}
                ];
            }])

        .controller('PlaylistCtrl', ['$scope', '$stateParams', function ($scope, $stateParams) {
            }]);
