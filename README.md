# 360 Web Panorama Viewer Virtual Tour Maker
Free Web Panorama Tour Maker Software

This software is built with Electron, using awesome JavaScript libraries such as Panolens, Three.js and the legendary jQuery.

It is open source and free, it will always be.

What you see in this repository are only my main app HTML, JavaScript and css files. 

There is a folder generated by Electron which is node_modules which I did not include here because its size is too big. 

Important modules that I used are: fs, fs-extra and remote. You need to install those modules:

npm install --save fs

npm install --save fs-extra

npm install --save remote

To build as Windows executable program, you need to install Electron Packager: npm install -g electron-packager 

Run this command to compile: electron-packager ./ 3Sixty v1.1.3 --platform=win32 --arch=x64 --icon=./icon.ico

Check out this oerview tutorial about how to use it: https://youtu.be/ZbKQ8qHgBH8

For more information and download link, visit my website: https://3sixty.webappdev.my.id/
