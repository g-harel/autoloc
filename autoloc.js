// node packages
var fs = require('fs');
 
// define the way to parse html files
require.extensions['.html'] = function(module, filename) {
    module.exports = fs.readFileSync(filename, 'utf8');
};
 
// define the way to parse json files
require.extensions['.json'] = function(module, filename) {
    var temp;
    try {
         temp = JSON.parse(fs.readFileSync(filename, 'utf8'));
    } catch (e) {
        console.log('ERROR: could not parse json file.\n' + e);
        process.exit();
    }
    module.exports = temp;
};
 
// extract titles from json object
var titles = [];
try {
    var content = require('./' + (process.argv.slice(2)[0] || 'content.json'));
} catch (e) {
    console.log('ERROR: Could not find content.json or your file in this directory. Make sure to specify the data file in the command or create content.json');
    process.exit();
}
for (var key in content) {
    if (key !=='df' && content.hasOwnProperty(key)) {
        titles.push(key);
    }
}
 
// storing all block snippets from the blocks/ directory
var blocks = {};
try {
    fs.readdirSync('blocks/').forEach(function(name) {
        if (name.match(/\.html$/g)) {
            blocks[name.slice(0,-5)] = require('./blocks/'+ name);
        }
    });
} catch (e) { /* ~~ Won't break anything ~~ */ }
 
// fetching the template file
try {
    var template = require('./' + (process.argv.slice(2)[1] || 'index.html'));
} catch (e) {
    console.log('ERROR: Could not find index.html or your file in this directory. Make sure to specify the base file in the command or create index.html');
    process.exit();
}
 
// replacing "&&" tokens with their html blocks
function replace_blocks(source, block_list) {
    return source.replace(/&&\w+(\[\[\s*[\w\d]+\s*\]\])?/g, function(curr) {
        var block = curr.replace(/&&|\[\[s*[\w\d]+\s*\]\]|\s/g, '');
        var name = curr.replace(/&&\w+|\[|\]|\s/g, '');
        return (block_list[block] && ('\n<!--START-'+block+'_'+name+'-->\n'+block_list[block].replace(/\[x\]/g, block+'_'+name)+'\n<!--END-'+block+'_'+name+'-->\n')) || curr;
    });
}
 
// making sure the build folder exists
if (!fs.existsSync('build/')) {
    fs.mkdirSync('build');
}
 
// replacing the tokens for each title and saving the file
titles.forEach(function(val) {
    var temp = template.slice(0);
    var counter = 0;
    while (temp.match(/&&/g) || temp.match(/@@/)) {
        if (counter > 12) {
            console.log('\n\nERROR:');
            //console.log(('missing strings in default for '+val+':\n\t"'+(temp.match(/@@\.df(\.\w+)+/g)||[]).map(function(v){return v.replace(/@@\.df\./g,'');}).join('": "",\n\t"')+'": ""').replace(/"":\s""/g,''));
            //console.log(('missing strings in '+val+':\n\t"'+(temp.match(new RegExp('@@\.'+val+'(\.\w+)+','g'))||[]).map(function(v){return v.replace(/@@\.\w+\./g,'');}).join('": "",\n\t"')+'": ""').replace(/"": ""/g,''));
            //console.log('missing blocks in ' + val + ':\n' + (temp.match(/&&\w+(\[\[\s*\w+\s*\]\])?/g) || []).join('\n'));
            //console.log('note that this can also be cause by a looping reference.');
            //console.log(temp.match(/@@(\.\w+)+@?/g));
            break;
        }
        temp = temp.replace(/\[o\]/g, val);
        temp = temp.replace(/&&\w+(\[\[\s*[\w\d]+\s*\]\])?/g, function(curr) {
            var block = curr.replace(/&&|\[\[s*[\w\d]+\s*\]\]|\s/g, '');
            var name = curr.replace(/&&\w+|\[|\]|\s/g, '');
            return (blocks[block] && ('\n<!--START-'+block+'_'+name+'-->\n'+block_list[block].replace(/\[x\]/g, block+'_'+name)+'\n<!--END-'+block+'_'+name+'-->\n')) || curr;
        });
        temp = temp.replace(/@@(\.\w+)+({.+})?@/g, function(val) {
            find(content, val.slice(3,-1).split('.'));
            function find(obj, address) {
                console.log(address)
                if (typeof obj === 'string') {
                    if (!obj) {
                        console.log('could not find ' + val)
                        return val;
                    } else if (obj[0] === '{') {
                        console.log('defaulted' + address[0].slice(1,-1))
                        return address[0].slice(1,-1);
                    } else {
                        return obj;
                    }
                } else {
                    return find(obj[address.shift()], address);
                }
            }
        });
        counter++;
    }
    temp = temp.split('').map(function(val) {
        var cc = val.charCodeAt(0);
        if (cc > 127) {
            return '&#' + cc + ';';
        }
        return val;
    }).join('');
    fs.writeFileSync(`build/index_${val}.html`, temp);
});
