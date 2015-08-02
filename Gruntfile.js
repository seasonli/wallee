/**
 * @Fileoverview Grunt task configure
 *
 * @Author SeasonLi | season.chopsticks@gmail.com
 *
 * @Version 1.0 | 2015-01-18 | SeasonLi    // Initial version
 *                                         // Add copy task
 * @Version 1.1 | 2015-02-03 | SeasonLi    // Adjust config ways
 * @Version 1.2 | 2015-02-04 | SeasonLi    // Use imagemin
 * @Version 1.3 | 2015-02-07 | SeasonLi    // Use less
 *                                         // Regularize tasks settings
 * @Version 1.4 | 2015-02-22 | SeasonLi    // Use requirejs
 *                                         // Dynamic config scripts should be optimized
 *                                         // Use filerev & usemin
 * @Version 1.5 | 2015-02-24 | SeasonLi    // Optimize tasks
 * @Version 1.6 | 2015-03-08 | SeasonLi    // Optimize match scripts
 *                                         // Optimize release task
 * @Version 1.7 | 2015-03-16 | SeasonLi    // Use tpl widget compile
 * @Version 2.0 | 2015-06-07 | SeasonLi    // 改进了前端编译工作流，更好地开发体验
 *
 * @description
    前端编译原则：产出个页面 .mst 模板文件，处理好静态资源依赖关系，以使得 node mustache 编译阶段不处理静态资源加载问题
    前端编译顺序：less 编译 －> image 压缩 -> page 拼装 －> page 继承注入 -> 静态资源依赖注入
 **/

var path = require('path'),
  fs = require("fs"),
  glob = require('glob'),
  cheerio = require('cheerio');


var recurseFiles = function(ext, dir) {
  var map = {};
  (function(dir) {
    var items = fs.readdirSync(dir);
    for (var idx in items) {
      var entityDir = path.join(dir, items[idx]),
        entityStat = fs.lstatSync(entityDir);
      if (entityStat.isDirectory()) {
        arguments.callee(entityDir);
      } else {
        if (items[idx].split('.')[1] == ext) {
          map[entityDir.replace(process.cwd(), '')] = {};
          var cssEntity = entityDir.replace(/\..*$/, '.less');
          try {
            var cssEntityStat = fs.lstatSync(cssEntity);
            map[entityDir.replace(process.cwd(), '')].css = cssEntity.replace(process.cwd(), '');
          } catch (e) {
            //
          }
          var jsEntity = entityDir.replace(/\..*$/, '.js');
          try {
            var jsEntityStat = fs.lstatSync(jsEntity);
            map[entityDir.replace(process.cwd(), '')].js = jsEntity.replace(process.cwd(), '');
          } catch (e) {
            //
          }
        }
      }
    }
  })(dir);
  return map;
};

var mkdirsSync = function(dirname, mode) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkdirsSync(path.dirname(dirname), mode)) {
      fs.mkdirSync(dirname, mode);
      return true;
    }
  }
};


var __insertBlocks = function(content, parentPageContent) {
  var blockMap = (function() {
    var blockMap = {},
      blockList = content.match(/\{\{block\(\'(.*?)\'\)\}\}.*?\{\{\/block\}\}/g);
    for (var i in blockList) {
      blockMap[blockList[i].replace(/\{\{block\(\'(.*?)\'\)\}\}.*?\{\{\/block\}\}/g, '$1')] = blockList[i].replace(/\{\{block\(\'.*?\'\)\}\}(.*?)\{\{\/block\}\}/g, '$1');
    }
    return blockMap;
  })();

  parentPageContent = parentPageContent.replace(/\{\{block\(\'(.*)\'\)\}\}\{\{\/block\}\}/g, function(content, $1) {
    return blockMap[$1];
  });

  return parentPageContent;
};

var __insertDependencies = function(content, page) {
  if (page.css) {
    var link = '<link rel="stylesheet" type="text/css" href="' + '../../static' + page.css.replace(/\.less$/, '.css') + '">';
    content = content.replace(/(<\/head>)/, link + '$1');
  }
  if (page.js) {
    var script = '<script type="text/javascript" src="' + '../../static' + page.js + '"></script>';
    content = content.replace(/(<\/body>)/, script + '$1');
  }
  return content;
};

var __dependency = function() {
  var widgetMap = recurseFiles('html', path.join(process.cwd(), 'widget'));
  var pageMap = recurseFiles('html', path.join(process.cwd(), 'page'));

  for (var pageDir in pageMap) {
    var page = pageMap[pageDir],
      content = fs.readFileSync(path.join(process.cwd(), '__dev', pageDir), 'utf-8'),
      parentPageContent = (function() {
        if (!content.match(/\{\{extend\(\'(.*)\'\)\}\}/g)) {
          return null;
        }
        var parentPageDir = content.match(/\{\{extend\(\'(.*?)\'\)\}\}/)[0].replace(/\{\{extend\(\'(.*?)\'\)\}\}/, '$1');
        return fs.readFileSync(path.join(process.cwd(), '__dev', pageDir, '../', parentPageDir), 'utf-8');
      })(),
      widgetList = (function() {
        var widgetList = fs.readFileSync(path.join(process.cwd(), pageDir), 'utf-8').match(/\{\{include\(\'(.*?)\'\)\}\}/g);
        for (var i in widgetList) {
          widgetList[i] = widgetList[i].replace(/\{\{include\(\'(.*?)\'\)\}\}/g, '/$1');
        }
        return widgetList;
      })();

    if (parentPageContent) content = __insertBlocks(content, parentPageContent);

    content = __insertDependencies(content, page);

    for (var i in widgetList) {
      var widget = widgetList[i];
      content = __insertDependencies(content, widgetMap[widget]);
    }

    fs.writeFileSync(path.join(process.cwd(), '__dev', pageDir), content);
  }
};

module.exports = function(grunt) {
  grunt.config.init({
    pkg: grunt.file.readJSON('package.json'),
    watch: {
      options: {
        spawn: false
      },
      common: {
        files: ['{page,widget,static}/**/*.*'],
        tasks: ['__copy', '__less', '__includereplace', '__htmlmin', '__dependency']
      }
    },
    copy: {
      common: {
        files: [{
          expand: true,
          cwd: '',
          src: ['static/**/*.{js,png,jpg,jpeg,gif,eot,svg,ttf,woff,woff2,mst}'],
          dest: '' // Configure
        }, {
          expand: true,
          cwd: '',
          src: ['{page,widget}/**/*.{js,png,jpg,jpeg,gif,eot,svg,ttf,woff,woff2,mst}'],
          dest: '' // Configure
        }]
      }
    },
    less: {
      common: {
        files: [{
          expand: true,
          cwd: '',
          src: ['static/**/*.less'],
          dest: '', // Configure
          ext: '.css'
        }, {
          expand: true,
          cwd: '',
          src: ['{page,widget}/**/*.less'],
          dest: '', // Configure
          ext: '.css'
        }]
      }
    },
    includereplace: {
      common: {
        options: {
          prefix: '{{',
          suffix: '}}',
          includesDir: process.cwd()
        },
        files: [{
          expand: true,
          cwd: '',
          src: ['page/**/*.{html,mst}'],
          dest: '' // Configure
        }]
      }
    },
    htmlmin: {
      common: {
        options: {
          removeComments: true,
          collapseWhitespace: true
        },
        files: [{
          expand: true,
          cwd: '', // Configure
          src: ['page/**/*.html'],
          dest: ''
        }]
      }
    },
    imagemin: {
      options: {
        optimizationLevel: 3,
      },
      common: {
        files: [{
          expand: true,
          cwd: '', // Dynamic config
          src: ['{page,static,module}/**/*.{png,jpg,jpeg,gif}'],
          dest: '' // Dynamic config
        }]
      }
    },
    requirejs: {
      common: {
        options: {
          mainConfigFile: 'static/js/requireConfig.js',
          dir: '', // Dynamic config
          modules: [] // Dynamic config
        }
      }
    },
    filerev: {
      options: {
        encoding: 'utf8',
        algorithm: 'md5',
        length: 6
      },
      common: {
        files: [{
          expand: true,
          cwd: '',
          src: '', // Dynamic config
          dest: ''
        }]
      }
    },
    usemin: {
      options: {
        assetsDirs: [], // Dynamic config
        patterns: {
          common: [
            [/([a-zA-Z\.\d]+\.js|[a-zA-Z\.\d]+\.css)/g]
          ]
        }
      },
      common: {
        files: [{
          expand: true,
          cwd: '',
          src: '', // Dynamic config
          dest: ''
        }]
      }
    }
  });


  // Load npm tasks 载入 grunt task 包
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-include-replace');
  grunt.loadNpmTasks('grunt-contrib-htmlmin');
  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-filerev');
  grunt.loadNpmTasks('grunt-usemin');


  // Internal tasks 内部任务
  // Internal setting task 内部配置任务
  grunt.task.registerTask('__set', function() {
    var __dest = grunt.config.get('__config.dest', __dest);

    grunt.config.set('copy.common.files.0.dest', __dest);
    grunt.config.set('copy.common.files.1.dest', __dest + 'static/');

    grunt.config.set('less.common.files.0.dest', __dest);
    grunt.config.set('less.common.files.1.dest', __dest + 'static/');

    grunt.config.set('includereplace.common.files.0.dest', __dest);

    grunt.config.set('htmlmin.common.files.0.cwd', __dest);
    grunt.config.set('htmlmin.common.files.0.dest', __dest);
    // grunt.config.set('imagemin.common.files.0.cwd', dest);
    // grunt.config.set('imagemin.common.files.0.dest', dest);
    // grunt.config.set('requirejs.common.options.dir', dest + 'module/');

    // grunt.config.set('filerev.common.files.0.src', staticFileList);
    // grunt.config.set('usemin.options.assetsDirs', staticDirList);
    // grunt.config.set('usemin.common.files.0.src', dest + 'page/**/*.html')
  });
  // Internal logic task 内部业务任务
  grunt.task.registerTask('_watch', function() {
    grunt.task.run('watch:common');
  });
  grunt.task.registerTask('__copy', function() {
    grunt.task.run('copy:common');
  });
  grunt.task.registerTask('__includereplace', function() {
    grunt.task.run('includereplace:common');
  });
  grunt.task.registerTask('__htmlmin', function() {
    grunt.task.run('htmlmin:common');
  });
  grunt.task.registerTask('__dependency', function() {
    __dependency();
  });
  grunt.task.registerTask('__less', function() {
    grunt.task.run('less:common');
  });
  grunt.task.registerTask('__imagemin', function() {
    grunt.task.run('imagemin:common');
  });
  grunt.task.registerTask('__requirejs', function() {
    grunt.task.run('requirejs:common');
  });
  grunt.task.registerTask('__filerev', function() {
    grunt.task.run('filerev:common');
  });
  grunt.task.registerTask('__usemin', function() {
    grunt.task.run('usemin:common');
  });

  // Interface tasks 接口任务（通过 Command line 调用）
  // Release
  grunt.task.registerTask('release', function() {
    var watch = grunt.option('watch');

    grunt.config.set('__config.dest', '__dev/');
    grunt.task.run('__set');

    if (watch) {
      grunt.task.run('_watch');
    } else {
      grunt.task.run('__copy');
      grunt.task.run('__less');
      grunt.task.run('__includereplace');
      grunt.task.run('__htmlmin');
      grunt.task.run('__dependency');
      // grunt.task.run('_imagemin');
      // grunt.task.run('_requirejs');
      // grunt.task.run('_filerev');
      // grunt.task.run('_usemin');
    }
  });
};