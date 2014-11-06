var path = require('path')
, gutil = require('gulp-util')
, through = require('through2')
, crypto = require('crypto')
, fs = require('fs');

module.exports = function (size, ifile) {
    size = size | 0;
    return through.obj(function (file, enc, cb) {
        if (file.isStream()) {
            this.emit('error', new gutil.PluginError('gulp-debug', 'Streaming not supported'));
            return cb();
        }

        var d = calcMd5(file, size)
        , filename = path.basename(file.path)
        , dir;

        if(file.path[0] == '.'){
            dir = path.join(file.base, file.path);
        } else {
            dir = file.path;
        }
        dir = path.dirname(dir);

        var md5_filename = filename.split('.').map(function(item, i, arr){
            return i == arr.length-2 ? item + '_'+ d : item;
        }).join('.');
        walk(ifile,function(err,results){
            if (err) return console.log(err);
            results.forEach(function(ilist){
                fs.readFile(ilist,'utf8',function(err,data){
                    if(err){
                        return console.log(err)
                    }
                    var result = data.replace(new RegExp(filename), md5_filename);

                    var newData = fs.writeFile(ilist, result, 'utf8', function (err) {
                        if (err) return console.log(err);
                    });
                })
            })
        })
        

        file.path = path.join(dir, md5_filename);

        this.push(file);
        cb();
    }, function (cb) {
        cb();
    });
};


function calcMd5(file, slice){
    var md5 = crypto.createHash('md5');
    md5.update(file.contents, 'utf8');

    return slice >0 ? md5.digest('hex').slice(0, slice) : md5.digest('hex');
}

function walk(dir, done) {
  var results = [];
  fs.stat(dir,function(err,stat){
    if(stat && stat.isDirectory()){
        fs.readdir(dir, function(err, list) {
            if (err) return done(err);
            var pending = list.length;
            if (!pending) return done(null, results);
            list.forEach(function(file) {
                file = dir + '/' + file;
              fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                  walk(file, function(err, res) {
                    results = results.concat(res);
                    if (!--pending) done(null, results);
                  });
                } else {
                  results.push(file);
                  if (!--pending) done(null, results);
                }
              });
            });
          });
    }else{
        results.push(dir);
        done(null, results);
    }
  })
};