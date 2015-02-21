/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        ngAnnotate: {
            options: {
                singleQuotes: true
            },
            app: {
                files: [
                    {
                        expand: true,
                        src: ['js/*.js']
                    }
                ]
            }
        },
        useminPrepare: {
            html: 'index.html',
            options: {
                dest: '../www',
                staging: '../tmp'
            }
        },
        usemin: {
            html: '../www/index.html',
            options: {
                dest: '../www'
            }
        },
        filerev: {
            options: {
                algorithm: 'md5',
                length: 8
            }
        },
        copy: {
            prod: {
                files: [
                    {
                        expand: false,
                        src: ['index.html'],
                        dest: '../www/'

                    },
                    {
                        expand: true,
                        src: ['templates/*.html'],
                        dest: '../www/'
                    },
                    {
                        expand: false,
                        src: ['lib/cordova-app-loader/dist/bootstrap.js'],
                        dest: '../www/'
                    },
                    {
                        expand: false,
                        src: ['lib/cordova-app-loader/dist/cordova-app-loader-complete.js'],
                        dest: '../www/'
                    }
                ]
            },
            manifest: {
                files: [
                    {
                        expand: false,
                        src: ['manifest.json'],
                        dest: '../www/'
                    }
                ]
            }
        },
        jsonmanifest: {
            generate: {
                options: {
                    basePath: '../www',
                    exclude: [],
                    //load all found assets
                    loadall: true,
                    //manually add files to the manifest
                    files: {},
                    //manually define the files that should be injected into the page
                    load: [],
                    // root location of files to be loaded in the load array.
                    root: "./"
                },
                src: [
                    'app/*.js',
                    'lib/*.js',
                    'css/*.css',
                    'templates/*.html'
                ],
                dest: ['manifest.json']
            }
        }
    });

    grunt.registerTask('build', [
        'ngAnnotate',
        'copy:prod',
        'useminPrepare',
        'concat:generated',
        'cssmin:generated',
        'uglify:generated',
        'filerev',
        'usemin',
        'jsonmanifest',
        'copy:manifest'
    ]);

    grunt.loadNpmTasks('grunt-usemin');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-filerev');
    grunt.loadNpmTasks('grunt-ng-annotate');
    grunt.file.setBase('app');


    //GRUNT TASK TO BUILD A JSON MANIFEST FILE FOR HOT CODE UPDATES
    grunt.registerMultiTask('jsonmanifest', 'Generate JSON Manifest for Hot Updates', function () {

        var options = this.options({loadall: true, root: "./", files: {}, load: []});
        var done = this.async();

        var path = require('path');

        this.files.forEach(function (file) {
            var files;

            //manifest format
            var json = {
                "files": options.files,
                "load": options.load,
                "root": options.root
            };

            //clear load array if loading all found assets
            if (options.loadall) {
                json.load = [];
            }

            // check to see if src has been set
            if (typeof file.src === "undefined") {
                grunt.fatal('Need to specify which files to include in the json manifest.', 2);
            }

            // if a basePath is set, expand using the original file pattern
            if (options.basePath) {
                files = grunt.file.expand({cwd: options.basePath}, file.orig.src);
            } else {
                files = file.src;
            }

            // Exclude files
            if (options.exclude) {
                files = files.filter(function (item) {
                    return options.exclude.indexOf(item) === -1;
                });
            }

            // Set default destination file
            if (!file.dest) {
                file.dest = ['manifest.json'];
            }

            // add files
            if (files) {
                files.forEach(function (item) {
                    var hasher = require('crypto').createHash('sha256');
                    var filename = encodeURI(item);
                    var key = filename.split("/");
                    key = key[key.length - 1];
                    json.files[key] = {}
                    json.files[key]['filename'] = filename;
                    json.files[key]['version'] = hasher.update(grunt.file.read(path.join(options.basePath, item))).digest("hex")

                    if (options.loadall) {
                        json.load.push(filename);
                    }
                });
            }
            //write out the JSON to the manifest files
            file.dest.forEach(function (f) {
                grunt.file.write(f, JSON.stringify(json, null, 2));
            });

            done();
        });

    })

};
