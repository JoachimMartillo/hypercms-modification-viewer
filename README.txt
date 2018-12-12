This the hyperactive-user-manager project.

[The creation procedure is recorded in README.txt in the
project. Markdown processing seems to broken.]

It was created by entering the Intellij toplevel workspace and
executing the following command.

[Note that Intellij Universal, express & npm should have been
previously installed.]

express hypercms-user-manger

The following changes were made to the result to make it importable
into Intellij/GitHub.

Then the pom.xml file was added.

The groupId & artifactID were set as follows.

    <groupId>com.hyperactive.server</groupId>
    <artifactId>hypercms-user-manager</artifactId>

No other changes were made to this file although it may have to be
updated.

The name in the package.json file was set as follows.

  "name": "hyperactive-user-manager",

The variable debug was set as follows in the bin/www file.

var debug = require('debug')('hyperactive-user-manager');

Because emacs was used to edit the files, backup files~ were created
in the directory tree.

This tree was cleaned up as follows.

find . -name '*~' -exec rm {} \; -print

The following shows that only 19 files will be put into Git/Github.

find . -print | wc

[Obviously this number may change as express changes.]

Now we are ready to run Intellij and import from existing sources.

Then we will send the project to Github.

Then we will be ready to develop.

Here are the current files and directories.

./pom.xml
./routes
./routes/index.js
./routes/users.js
./package.json
./.idea
./.idea/workspace.xml
./.idea/sbt.xml
./.idea/modules.xml
./.idea/misc.xml
./app.js
./public
./public/images
./public/stylesheets
./public/stylesheets/style.css
./public/javascripts
./views
./views/layout.jade
./views/index.jade
./views/error.jade
./README.txt
./bin
./bin/www

We import from existing sources. We use the maven model. Just accept
all defaults. Recreate files, but don't invoke npm to install
dependencies. Click on pom.xml, & add as maven project. If a file is
identified of wrong type, and if Intellij informs that it needs to be
recreated, let Intellij do it. You may have to click on the pom.xml
twice to add it as a maven project.

Now use VCS->Import into Version Control->Share onto Github to share
onto Github. Now we can run npm install. The installed dependencies
need not be imported into Github. There will probably be several
hundred at least.

To use maven you will probably have set the Project JDK even though it
is meaningless in this case.



