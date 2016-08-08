var path = require('path')
, gutil = require('gulp-util')
, through = require('through2')
, crypto = require('crypto')
, fs = require('fs')
, glob = require('glob')
, escapeRegExp = require('escape-string-regexp');

module.exports = function (size, ifile, root_path, prefix_url) {
    size = size | 0;
    return through.obj(function (file, enc, cb) {
        if (file.isStream()) {
            this.emit('error', new gutil.PluginError('gulp-debug', 'Streaming not supported'));
            return cb();
        }

        if(!file.contents){
            return cb();
        }

        var d = calcMd5(file, size)
        , filename = path.basename(file.path)
        , relativepath = path.relative(file.base ,file.path);
        
        var sub_namepath = relativepath.replace(new RegExp(escapeRegExp(filename)) , "").split(path.sep).join('/')
        , dir;

        // 如果资源发布到CDN，需要将URI替换成完成CDN完整资源路径
        var prefix_new = "";
        if(root_path && prefix_url){
            prefix_new = file.path.replace(root_path, '');
            prefix_new = prefix_new.replace(relativepath, '');
            prefix_new = prefix_new + sub_namepath;
            prefix_new = prefix_url + prefix_new;
        }

        // console.log('file.path:', file.path);
        // console.log('file.base:', file.base);
        // console.log('relativepath:', relativepath);
        // console.log('filename:', filename);
        // console.log('sub_namepath:',sub_namepath);
        // console.log('root_path:',root_path);
        // console.log('prefix_new:',prefix_new); 

        if(file.path[0] == '.'){
            dir = path.join(file.base, file.path);
        } else {
            dir = file.path;
        }
        dir = path.dirname(dir);
        // console.log(filename)
        var md5_filename = prefix_new + filename + '?' + d;
        // var prefix = 'http://cdn.gf.com.cn/'
        // var md5_filename = filename.split('.').map(function(item, i, arr){
        //     return i == arr.length-2 ? prefix + item + '?'+ d : item;
        // }).join('.');
        ifile && glob(ifile,function(err, files){
            if(err) return console.log(err);
            files.forEach(function(ilist){
                var result;
                if(prefix_new){
                    result = fs.readFileSync(ilist,'utf8').replace(new RegExp( "\"[^\"]*" + escapeRegExp(sub_namepath + filename)),  "\"" + md5_filename);
                } else {
                    result = fs.readFileSync(ilist,'utf8').replace(new RegExp(escapeRegExp(sub_namepath + filename)),  sub_namepath + md5_filename);
                }
                fs.writeFileSync(ilist, result, 'utf8');
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
