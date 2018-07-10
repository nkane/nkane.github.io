---
layout: post
Title: "Win32 Software Renderer Lesson 1: Getting Started"
date: 2018-07-04
categories: blog gamedev gaming graphics
visible: 0
---
Computer graphics programming has always been an interest of mine; however, I would consider the barrier to entry in to the world of computer graphics high.
As a prerequisite in to computer graphics, it is assumed that the individual seeking to study the topic already has a large foundation of knowledge, inclusive of
an intuitive understanding of higher level mathematics and at least a bit of lower level computer programming knowledge (i.e., "lower level" - meaning
understading how the code that is written is used by the particular set of computer hardware that the individual is working with). Although certain people would
argue that you can program graphics without the having a lower level understanding of the computer programming, I will not be using a higher level language in 
this series. It is not my goal with this series to convince anyone not use a higher level programming language for computer graphics. Instead, I would like to
explore my own particular interest using a programming language and toolset that I am comfortable with.


### The C Programming Language
The language that I will be using throughout this series is the [C programming language][c-lang]. If you are not familiar with computer programming, a good
place to start would be learning C by picking up a book called ["A First Book of ANSI C"][first-book-of-c], or by watching a course on the web. The book that
I have recommended is the book that I used to initially learn C, so I recommend reading it from cover to cover and completing all of the exercises within it.
In addition here are a few other options that will complement your skills after completing the above:

- [Learn C The Hard way][learn-c-the-hard-way]
- [C Programming Language][k&r]


### Window Command Line Interface (CLI)
At this particular point in time, I am using the Microsoft Windows 10 operating system. Windows has a "command prompt" or "CLI" that we will be using to run
particular commands or scripts. The Windows CLI can be accessed by launching the Windows "run" program and typing in "cmd". Find a course on the web, or a tutorial
online to help familiarize yourself with the Windows CLI; additionally, we are going to want to "pin" to the task bar or create a desktop shortcut to the command prompt
for future use with command line arguments fed to the CLI program ([cmd.exe][cmd]). In order to set up our CLI to be Windows C Development friendly, we are going to 
need to install Visual Studio. Just a quick side n ote, using Visual Studio is not necessary if you like to use other compilers or debuggers; however, for this tutorial
I will be using the [Microsoft C/C++ compiler][cl].


### Visual Studio
[Visual Studio][vs] is an "integrated development envirnoment" (IDE). Currently, I am using Visual Studio 2017 Community Edition x86 on my development computer. In case
the reader is not familiar with the what x86 is, it just means that the program is a 32-bit binary instead of a 64-bit binary; however, the x64 or 64-bit version can be
downloaded instead of the 32-bit version. If you are concerned with what that [means][binary-x86-x64], it just boils down to accessible memory address space of the binary.
This information is particularly important due to the way that Visual Studio was packaged in older versions. Since packaging has not remain consistent throughout
the different versions of Visual Studio, I would not count on specific information being accurate regarding Visual Studio script names, script locations, and script
behaviors for different version other than Visual Studio 2017 Community Edition (e.g., you may have to do research on the differences); however, if you stick with the same
version I am using you should be up and running by the end of this article. You will need to make sure to install the C/C++ development envirnoments whenever options are
listed during the installation, and it would not hurt to have the Windows 10 SDK installed as well. Even though Visual Studio provides a text editor, and a bunch of other
features that I do not use. I typically use the text editor program called [Vim][vim] to edit my source code files, the Windows CLI to compile the code using a compiler
that was installed with Visual Studio, and Visual Studio as a debugger for the built binary that is produce through the Windows CLI.


### Microsoft Visual C/C++ (MSVC) and cl.exe
After Visual Studio has been installed with the C/C++ packages, [Microsoft Visual C++][msvc] (MSVC) with all of the libraries and tools will now be accessible for usage.
In particular, we need to set up our Windows CLI to be able to use all of these new tools that were installed with Visual Studio / MSVC. We need to be able to execute
the [Microsoft C/C++ compiler][cl] (cl.exe). In order to make our Window's CLI a Win32 C development CLI envirnoment, we are going to be setup a few batch script files
to run when the Windows shortcut to the CLI is executed. In other words, we are going to be passing in command line arguments to the Windows CLI program (cmd.exe).


### Batch Files (.bat)
[Batch files][bat] are script files for Windows. These script files contain a series of commands to be executed by the CLI. We will not be exploring deeply in to batch
file scripting, so just understanding what we are trying to accomplish and how we use the script files to assist us is the only requirement.


### Setting Up Windows CLI to Build With MSVC
Finally, we get to setup our Windows CLI to be able to use the Microsoft C/C++ compiler; however, before we get started with setting up our CLI to use these tools I wanted
to take a moment to reiterate the following, if you are using a different version of Visual Studio / MSVC it is possible the location, naming conventions, or existance of
the scripts that will be referenced in the next section have changed based on past packaging changes that Microsoft has done. Just to be explicit about what I am referring
to, in the past the location of a file named ["vcvarsall.bat"][vcvarsall] has changed within the last few versions of Visual Studio. Now that we have that cleared up, let's
start setting up our basic batch file that will be executed on our shortcut to our Windows CLI.

First, we need to find a batch file script named ["vsdevcmd.bat"][vsdevcmd] that is shipped with the installation of Visual Studio / MSVC. For the installation of Visual
Studio that I am using, the file is located at *"C:\Program Files (x86)\Microsoft Visual Studio\2017\Community\Common7\Tools\VsDevCmd.bat"*. Next, pick a spot on your hard
drive to store the batch file, typically I like to store my file under my users directory in Windows (*C:\Users\\{username}*) and name it *"win32_shell.bat"* or whatever else that
you would perfer. Once that batch file has been created, we should have the following inside:

``` bat
:: win32_shell.bat
CALL "C:\Program Files (x86)\Microsoft Visual Studio\2017\Community\Common7\Tools\VsDevCmd.bat"
```

Just to be explicit about why we call this batch file that is shipped with Visual Studio's, the "vsdevcmd.bat" file sets up our CLI instance to be able to use the Microsoft
C/C++ compiler and other development tools. Great! Now, we need to hook up our shortcut to be able to execute our batch file whenever we click on our shortcut icon of the
Windows CLI. By right clicking and selecting the properties of the icon, a field named "Target" under the "Shortcut" tab should be visible. The "Target" field should have
a textbox as to the right of it that is filled with the following or simliar information: "%windir%\system32\cmd.exe". This basically just tells the shortcut where the
actual executable of "cmd.exe" is located. In addition to the location of the "cmd.exe" executable, we are going to want to pass in a CLI argument that will allow us to
have our new batch file executable on start up of the "cmd.exe" program. The "/K" flag for the executable "cmd.exe" states that it "carries out the command specificed by
a string but remains". In other words, it will execute on the CLI whatever is passed in quotes after the /K flag. We are going pass in the location of our batch file in
order to have that executed after the CLI has been loaded that way our CLI instance will have all of the Microsoft Visual Studio tooling avaiable to us via the CLI. Here
is an example of what our "Target" field should look with the CLI argument passed to it: *%windir%\system32\cmd.exe /K "C:\Users\\{user}\win32_shell.bat"*. Just for a frame
of refernce, this is exactly what my "Target" field is set to: *%windir%\system32\cmd.exe /K "C:\Users\nkane\win32_shell.bat"*.


#### TODO(nick): insert image of cmd properties here

### The Project Setup
We will be setting up a project folder(s) for each tutorial in order have individualized pieces that we will be building upon each lesson. I usually have a particular place
on my hard drive that I stored all of my code. Just pick a spot on your hard drive to store the source code for these projects. In order to maintain consistency throughout
the entire project, I recommend setting up each lesson's folder hierarchy as the following:

``` plain
-> hp-engine 			(main folder)
--> lesson 1 			(sub folder 1 of main folder)
----> code 				(sub solder of sub folder 1)
------> build.bat 		(build batch script)
------> win32_hp.c 		(c source code file)
--> lesson 2 			...
```

Next, let's just put a few lines of code inside of the "build.bat" file that will allow us to build our C source code. Place the following code inside of the *build.bat* file

``` bat
:: build.bat
IF NOT EXIST ..\build MKDIR ..\build
PUSHD ..\build
cl /Od /MTd /Zi /nologo ..\code\win32_hp.c /link user32.lib
POPD
```

The above batch file code will create a directory named "build" one relative directory back from the "code" directory, it will then change CLI's current directory to the "build"
directory, build the C source code inside of the "build" directory using the Microsoft C/C++ compiler (cl.exe), and go back to the "code" directory. If you are wondering
what all of those symbols are  on the "cl" line, those are [compiler options][cl-options] or arguments passed into the cl.exe. The /Od flag disables any compiler optimizations,
the /MTd flag creates a multithreaded executable file using [LIBCMTD.lib][libcmtd] which is a debugging version of the multithreaded standard C library, and .lib files are
[static libraries][libvsdll], the /Zi flag generates complete debugging information, the /nologo ignores a text logo and compiler information that is produced by the compiler,
and the /link option allows use to pass options to the [linker][linker] options that we use to pass in the static libraries that we need to link with. If you are not familiar
with the process of linking, it is a part of the executable compiliation process that takes all of the ["object files"][objectfiles] and combines them into a single executable
file, library, or another "object file".


#### TODO(nick): insert image of project folder layout


### Windows API (WinAPI or Win32)




### Windows API Handles


### Windows API WinMain
``` c
int main()
{
	return 0;
}
```


### Windows API PeekMessage, TranslateMessage, and DispatchMessage


### Windows API Window Class Callback


### Windows API WM_PAINT


[c-lang]:								https://en.wikipedia.org/wiki/C_(programming_language)
[first-book-of-c]:  					https://www.amazon.com/First-Book-Fourth-Introduction-Programming/dp/1418835560
[learn-c-the-hard-way]:					https://www.amazon.com/Learn-Hard-Way-Practical-Computational/dp/0321884922
[k&r]:									https://www.amazon.com/Programming-Language-2nd-Brian-Kernighan/dp/0131103628
[cmd]:									https://en.wikipedia.org/wiki/Cmd.exe
[vs]:									https://visualstudio.microsoft.com/
[binary-x86-x64]: 						https://www.howtogeek.com/129178/why-does-64-bit-windows-need-a-separate-program-files-x86-folder/
[vim]:									https://www.vim.org/download.php
[msvc]:									https://en.wikipedia.org/wiki/Microsoft_Visual_C%2B%2B
[cl]:									https://msdn.microsoft.com/en-us/library/wk21sfcf.aspx
[cl-options]:				 			https://msdn.microsoft.com/en-us/library/fwkeyyhe.aspx
[bat]: 									https://en.wikipedia.org/wiki/Batch_file
[vcvarsall]:							https://stackoverflow.com/questions/43372235/vcvarsall-bat-for-visual-studio-2017
[vsdevcmd]:								https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/how-to-set-environment-variables-for-the-visual-studio-command-line
[win32]:								https://en.wikipedia.org/wiki/Windows_API
[libcmtd]:								https://support.microsoft.com/en-us/help/154753/description-of-the-default-c-and-c-libraries-that-a-program-will-link
[libvsdll]:								https://stackoverflow.com/questions/913691/dll-and-lib-files-what-and-why
[linker]:								https://en.wikipedia.org/wiki/Linker_(computing)
[objectfiles]:							https://en.wikipedia.org/wiki/Object_file
