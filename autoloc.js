// node packages
var fs = require('fs');

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

// reading data from the json file
try {
    var content = require('./' + (process.argv.slice(2)[0] || 'content.json'));
} catch (e) {
    console.log('ERROR: Could not find content.json or your file in this directory. Make sure to specify the data file in the command or create content.json');
    process.exit();
}

// extract titles from json object
var titles = [];
for (var key in content) {
    if (key !=='df' && content.hasOwnProperty(key)) {
        titles.push(key);
    }
}

// define the way to parse html files
require.extensions['.html'] = function(module, filename) {
    module.exports = fs.readFileSync(filename, 'utf8');
};

// storing all block snippets from the blocks/ directory
var blocks = {};
try {
    fs.readdirSync('blocks/').forEach(function(name) {
        if (name.match(/\.html$/g)) {
            blocks[name.slice(0,-5)] = require('./blocks/'+ name) || '<!---->';
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

// making sure the build folder exists
if (!fs.existsSync('build/')) {
    fs.mkdirSync('build');
}

// replacing the tokens for each title and saving the file
titles.forEach(function(val) {
    console.log('\n+===================+');
    console.log('\nStarting ' + val + ':\n')
    var temp = template.slice(0);
    var counter = 0;
    var missing = {
        blocks: {},
        strings: {}
    }
    while (temp.match(/&&/g) || temp.match(/@@/)) {
        if (counter > 12) {
            break;
        }
        temp = temp.replace(/\[o\]/g, val);
        temp = temp.replace(/@@((?:\.\w+)+)(?:\.{(.+)})?@/g, function(mtch, addr, deflt) {
            return find(content, addr.slice(1).split('.'));
            function find(obj, address) {
                if (!obj) {
                    if (deflt) {
                        console.log('DEFAULTED    > ' + mtch + ' <    TO    > ' + deflt);
                        return deflt;
                    } else {
                        missing.strings[mtch] = '';
                        return mtch;
                    }
                } else if (typeof obj === 'string'){
                    return obj;
                } else {
                    return find(obj[address.shift()], address);
                }
            }
        });
        temp = temp.replace(/\{?&&([\w\d]+)\[\[(\s*[\w\d]+\s*)\]\]\}?/g, function(mtch, block, name) {
            if (mtch[0] === '{' && mtch.substr(-1) === '}') {
                return mtch;
            }
            if (!blocks[block]) {
                missing.blocks[block] = '';
                return mtch;
            }
            var blockname = block + '_' + name;
            block = blocks[block].replace(/\[x\]/g, blockname);
            return '\n<!--START-' + blockname + '-->\n' + block + '\n<!--END-' + blockname + '-->';
        });
        counter++;
    }
    if (missing.strings) {
        console.log('\nMISSING STRINGS FOR ' + val + ' :\n' + JSON.stringify(missing.strings).replace(/@@\.\w+\.|@/g, ''));
    }
    if (missing.blocks) {
        console.log('\nMISSING BLOCKS FOR ' + val + ' :\n' + JSON.stringify(missing.blocks));
    }
    console.log('\n----------------------\n' + temp);
    /*temp = temp.split('').map(function(val) {
        var cc = val.charCodeAt(0);
        if (cc > 127) {
            return '&#' + cc + ';';
        }
        return val;
    }).join('');
    fs.writeFileSync(`build/index_${val}.html`, temp);*/
});
