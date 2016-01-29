'use strict';

var fs = require('fs');
var path = require('path');

var gutil = require('gulp-util');
var through = require('through2');

var jsReg = /<\s*script\s+.*src\s*=\s*["|']([^"']+)[^>]*><\s*\/\s*script\s*>/gim;
var cssReg = /<\s*link\s+.*href\s*=\s*["|']([^"']+)[^>]*>/gim;
var imageReg = /<img[^>]+src\s*=\s*['"]([^'"]+)['"][^>]*>/gim;
var imgReg = /url\s*\(\s*['|"]?([^'")]+)['|"]?\s*\)/gim;
var base64Reg = /^data:image\/([^;]+);base64,/;

var isCss = function (str) {
    if (!str) return false;
    return /rel\s*=\s*["|']stylesheet["|']/.test(String(str));
};
var isHTTP = function (str) {
    if (!str) return false;
    return /^https?:/.test(String(str));
};
var isBase64 = function (str) {
    if (!str) return false;
    return base64Reg.test(str);
};

module.exports = function (option) {
    option = option || {};
    option.root = option.root || {};
    option.dir = option.dir || './dist';

    function getNewUrl(url, ext) {

        var paths = url.split('/');
        var filename = paths.pop(); //filename������װ��ַʱʹ�ã���ֹ����?���������ʧ�����
        var filenameArr = filename;	//ԭfilename�޸�ΪfilenameArr�������

        ext = ext || filenameArr.split('.').pop();

        var prefix = option.root[ext] || '';
        prefix && (prefix[prefix.length - 1] === '/' || (prefix += '/')); //�ô����������ݴ�����ֹ��ַ�г���˫б������
        paths.unshift(option.dir);

        var dir = path.resolve.apply(null, paths);
        try {
            var files = fs.readdirSync(dir);
            filenameArr = filenameArr.split('.');

            var newUrl = url;

            files.some(function (item) {
                item = item.split('.');
                //filenameArr[filenameArr.length - 1].split('?')[0] ���ڻ�ȡ�ļ���׺��ԭ��ʽ�޷���ȡ123.png?v=xxx�еĺ�׺
                if (filenameArr[0] === item[0] && filenameArr[filenameArr.length - 1].split('?')[0] === item[item.length - 1]) {
                    paths.shift();
                    newUrl = prefix + paths.join('/') + '/' + filename;	//ֱ�Ӹ����ļ�������ֹ?�������ʧ
                    return true;
                }
            });

            // replace multi `/` with single `/`
            newUrl = newUrl.replace(/([^:])(\/){2,}/g, '$1/');
            //console.log("Ok ==== "+newUrl)
            return newUrl;
        } catch (e) {
            //console.log("Error ==== "+url)
            return url;
        }
    }

    return through.obj(function (file, enc, fn) {
        if (file.isNull()) return fn(null, file);

        if (file.isStream()) return fn(new gutil.PluginError('gulp-cdn-replace', 'Streaming is not supported'));

        // Buffer
        var contents = file.contents.toString();
        contents = contents.replace(jsReg, function (match, url) {
            isHTTP(url) || (match = match.replace(/(src\s*=\s*["|'])([^"'>]+)(["|'])/, '$1' + getNewUrl(url, 'js') + '$3'));	//ʹ�÷����滻����ֹ��ԭ�ļ���Ⱦ
            return match;
        })
        .replace(imageReg, function (match, url) {
            isHTTP(url) || (match = match.replace(/(src\s*=\s*["|'])([^"'>]+)(["|'])/, '$1' + getNewUrl(url, 'image') + '$3'));	//ʹ�÷����滻����ֹ��ԭ�ļ���Ⱦ
            return match;
        })
        .replace(cssReg, function (match, url) {
            isHTTP(url) || (isCss(match) && (match = match.replace(/(href\s*=\s*["|'])([^"']+)(["|'])/, '$1' + getNewUrl(url, 'css') + '$3')));	//ʹ�÷����滻����ֹ��ԭ�ļ���Ⱦ
            return match;
        })
        .replace(imgReg, function (match, url) {
            isHTTP(url) || isBase64(url) || (match = match.replace(/(url\s*\(\s*['|"]?)([^'")]+)(['|"]?\s*\))/, '$1' + getNewUrl(url, 'css') + '$3'));	//ʹ�÷����滻����ֹ��ԭ�ļ���Ⱦ
            return match;
        });

        file.contents = new Buffer(contents);
        this.push(file);

        fn(null);
    });
};