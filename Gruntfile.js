/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Released under the <%= pkg.license %> License */\n',
    // Task configuration.
    shell: {
      oldTests: {
        command: 'node test/server.js',
        options: {
          stdout: true,
          failOnError: true
        }
      },
      // these are old that should eventually be rewritten to take advantage of grunt and the current build process
      buildParser: {
        command: 'node src/build.js',
        options: {
          stdout: true
        }
      },
      bench: {
        command: 'node benchmark/server.js',
        options: {
          stdout: true
        }
      },
      doc: {
        command: 'node docs/build.js',
        options: {
          stdout: true
        }
      },
      gitAdd: {
        command: 'git add <%= compress.distTarBall.options.archive %> <%= compress.distZip.options.archive %>',
        options: {
          stdout: true
        }
      }
    },
    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: true
      },
      core: {
        src: ['lib/dust.js'],
        dest: 'tmp/dust-core.js'
      },
      full: {
        src: ['lib/dust.js', 'lib/parser.js', 'lib/compiler.js'],
        dest: 'tmp/dust-full.js'
      }
    },
    copy: {
      core: {
        src: 'tmp/dust-core.js',
        dest: 'dist/dust-core.js'
      },
      coreMin: {
        src: 'tmp/dust-core.min.js',
        dest: 'dist/dust-core.min.js'
      },
      full: {
        src: 'tmp/dust-full.js',
        dest: 'dist/dust-full.js'
      },
      fullMin: {
        src: 'tmp/dust-full.min.js',
        dest: 'dist/dust-full.min.js'
      },
      license: {
        src: 'LICENSE',
        dest: 'dist/'
      }
    },
    uglify: {
      options: {
        banner: '<%= banner %>',
        mangle: {
          except: ['require', 'define', 'module', 'dust']
        }
      },
      core: {
        src: '<%= concat.core.dest %>',
        dest: 'tmp/dust-core.min.js'
      },
      full: {
        src: '<%= concat.full.dest %>',
        dest: 'tmp/dust-full.min.js'
      }
    },
    compress: {
      distTarBall: {
        options: {
          archive: 'archive/dust-<%= pkg.version %>.tar.gz',
          mode: 'tgz',
          pretty: true
        },
        files: [
          {expand: true, cwd: 'dist', src: ['**'], dest: 'dust-<%= pkg.version %>/', filter: 'isFile'}
        ]
      },
      distZip: {
        options: {
          archive: 'archive/dust-<%= pkg.version %>.zip',
          mode: 'zip',
          pretty: true
        },
        files: [
          {expand: true, cwd: 'dist', src: ['**'], dest: 'dust-<%= pkg.version %>/', filter: 'isFile'}
        ]
      }
    },
    clean: {
      build: ['tmp/*'],
      dist: ['dist/*'],
      specRunner: '_SpecRunner.html'
    },
    jshint: {
      options: {
        jshintrc: true
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      libs: {
        src: ['lib/**/*.js', 'util/**/*.js', 'src/**/*.js', '!lib/parser.js'] // don't hint the parser which is autogenerated from pegjs
      }
    },
    connect: {
     testServer: {
       options: {
         port: 3000,
         keepalive: true
       }
     }
    },
    jasmine: {
      allTests: {
        src: 'tmp/dust-full.min.js',
        options: {
          specs: ['test/jasmine-test/spec/**/*.js'],
          template: require('grunt-template-jasmine-istanbul'),
          templateOptions: {
            coverage: 'tmp/coverage/coverage.json',
            report: 'tmp/coverage'
          }
        }
      }
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib_test: {
        files: ['<%= jshint.libs.src %>', '<%= jasmine.allTests.options.specs%>'],
        tasks: ['jshint:libs', 'jasmine']
      }
    },
    bump: {
      options: {
        files: ['package.json', 'bower.json'],
        updateConfigs: ['pkg'],
        push: false,
        commitFiles: ['-a']
      }
    },
    log: {
      coverage: {
        options: {
          message: 'Coverage is run with `grunt test`. Look inside tmp/coverage'
        }
      },
      copyForRelease: {
        options: {
          message: 'OK. Done copying version <%= pkg.version %> build from tmp to dist'
        }
      },
      testClient: {
        options: {
        message: 'go to http://localhost:<%= connect.testServer.options.port %>/_SpecRunner.html.\n Ctrl-C to kill the server.'
        }
      },
      release: {
        options: {
          message: ['OK. Done bumping, adding, committing, tagging and pushing the new version',
                    '',
                    'You still need to manually do the following:',
                    '  * git push upstream && git push upstream --tags',
                    '  * npm publish'].join('\n')
        }
      }
    },
    testRhino : {
      files: ['test/rhino/lib/**/*.jar']
    }
  });

  grunt.registerMultiTask('testRhino', function(){
    var shellTaskConfig = grunt.config.get('shell'),
      commandList= [];

    //iterate over rhino jars - list is defined in task config
    this.files.forEach(function(fileGroup) {
      fileGroup.src.forEach(function(rhinoJar) {
        commandList.push('java -jar ' + rhinoJar + ' -f test/rhino/rhinoTest.js');
      });
    });

    grunt.log.ok(JSON.stringify(commandList));

    shellTaskConfig['rhinoTests'] = {
      command : commandList.join('&&'),
      options: {
        stdout: true,
        callback: function(err, stdout, stderr, cb) {
         if(err || stderr){
           grunt.warn('There are failing unit tests in Rhino');
         }
          cb();
        }
      }
    };
    grunt.config.set('shell', shellTaskConfig);
    grunt.task.run('shell:rhinoTests');
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-gh-pages');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-shell');

  // Npm tasks
  grunt.registerTask('default', ['build']);
  grunt.registerTask('build', ['clean:build', 'jshint', 'shell:buildParser','concat', 'uglify']);

  grunt.registerTask('test', ['clean:specRunner', 'build', 'jasmine', 'shell:oldTests', 'testRhino']);
  grunt.registerTask('testNode', ['shell:oldTests']);
  grunt.registerTask('testClient', ['build', 'jasmine:allTests:build', 'log:testClient', 'connect:testServer']);


  grunt.registerTask('copyForRelease', ['clean:dist', 'copy:core', 'copy:coreMin', 'copy:full', 'copy:fullMin', 'copy:license', 'log:copyForRelease']);
  grunt.registerTask('buildRelease', ['test', 'copyForRelease', 'compress']);
  grunt.registerTask('releasePatch', ['bump-only:patch', 'buildRelease', 'shell:gitAdd:archive', 'bump-commit', 'log:release']);
  grunt.registerTask('releaseMinor', ['bump-only:minor', 'buildRelease', 'shell:gitAdd:archive', 'bump-commit', 'log:release']);
  // major release should probably be done with care
  // grunt.registerTask('releaseMajor', ['bump-only:major', 'buildRelease', 'bump-commit:major', 'log:release']);

  // Custom tasks
  grunt.registerMultiTask('log', 'Print some messages', function() {
    grunt.log.writeln(this.data.options.message);
  });
  grunt.registerTask('coverage', ['log:coverage']);

};
