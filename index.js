/* jshint esnext: true */
/* jshint node: true */

"use strict";

var path = require("path");
var cofs = require("co-fs");
var co = require("co");

module.exports = {
  apply: function(resolver) {
    //   console.info(resolver);
    resolver.plugin(['file'], function(request, callback) {
        const allowGroup = !request.query || request.query.indexOf("no-scale-group") < 0;
        if(/\.(jpe?g|png|gif)$/i.test(request.request) && allowGroup){
            // console.info("request", request);
            const filename = path.basename(request.request);
            const reldir = path.dirname(request.request);
            const dir = path.resolve(request.path, reldir);
            const ext = path.extname(filename);
            const base = filename.substr(0, filename.length - ext.length);
            // console.info(dir, base, ext);
            const _this = this;
            const scales = [
                {suffix:'', scale: 1},
                {suffix:"@1x", scale: 1},
                {suffix:"@2x", scale: 2},
                {suffix:"@3x", scale: 3}];
            co(function*(){

                const exists = yield scales.map(function(scale){
                    return cofs.exists(path.join(dir, base+scale.suffix+ext));
                });
                const objs = {};
                exists.forEach(function(exist, i){
                    const scale = scales[i];
                    if(exist){
                        objs[scale.scale] =
                        "var scale" + scale.scale + " = require(\"image-size?name=[hash].[ext]!./" + base + scale.suffix + ext + "?no-scale-group\");\n" +
                        "scale" + scale.scale + ".scale = " + scale.scale + ";\n" +
                        "result.scales[\"" + scale.scale + "\"] = scale" + scale.scale + ";";
                    }
                });
                const objArr = [];
                for(const i in objs){
                    objArr.push(objs[i]);
                }
                const content =
                    "/* THIS IS A GENERATED FILE, DO NOT MODIFY THE CONTENTS */\n"+
                    "var result = { name: \"" + base + "\", scales: [] };\n" +
                    objArr.join("\n") +
                    "\nmodule.exports = result;";
                const tempjs = path.join(dir, base + ".asset.js");
                yield cofs.writeFile(tempjs, content, "utf-8");
                console.info("create asset js module for image group", request.request);
                var obj = {
                  path: request.path,
                  request: path.join(reldir, base + ".asset.js"),
                  query: null,
                  directory: request.directory
                };
                //     this.doResolve(['file'], obj, callback);
                _this.doResolve(['file'], obj, callback);
            })
            .catch(function(err){
                callback(err);
            });
        }else{
            callback();
        }
    });
  }
};
