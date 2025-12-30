const builder = require('electron-builder');
const fs = require('fs');

builder.build({
    config: {
        directories: {
            output: 'dist',
        },
        files: [
            'build/**/*',
            'electron/**/*',
            'package.json'
        ],
        win: {
            target: 'nsis',
        },
        asar: false
    }
})
    .then(() => {
        console.log('Build success');
        fs.writeFileSync('build_result.txt', 'Success');
    })
    .catch((error) => {
        console.error('Build failed');
        const errorMsg = error.stack || error.toString();
        fs.writeFileSync('build_error.txt', errorMsg);
    });
