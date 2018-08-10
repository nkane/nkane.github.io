---
layout: post
Title: "Win32 Software Renderer Lesson 1: Getting Started"
date: 2018-08-04
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
need to install Visual Studio. Just a quick side note, using Visual Studio is not necessary if you like to use other compilers or debuggers; however, for this tutorial
I will be using the [Microsoft C/C++ compiler][cl].


### Visual Studio
[Visual Studio][vs] is an "integrated development environment" (IDE). Currently, I am using Visual Studio 2017 Community Edition x86 on my development computer. In case
the reader is not familiar with the what x86 is, it just means that the program is a 32-bit binary instead of a 64-bit binary; however, the x64 or 64-bit version can be
downloaded instead of the 32-bit version. If you are concerned with what that [means][binary-x86-x64], it just boils down to accessible memory address space of the binary.
The following version information is particularly important due to the way that Visual Studio was packaged in older versions. Since packaging has not remain consistent
throughout the different versions of Visual Studio, I would not count on specific information being accurate regarding Visual Studio script names, script locations, and
script behaviors for different version other than Visual Studio 2017 Community Edition (e.g., you may have to do research on the differences); however, if you stick with
the same version I am using you should be up and running by the end of this article. You will need to make sure to install the C/C++ development envirnoments whenever
options are listed during the installation, and it would not hurt to have the Windows 10 SDK installed as well. Even though Visual Studio provides a text editor, and a
bunch of other features that I do not use. I typically use the text editor program called [Vim][vim] to edit my source code files, the Windows CLI to compile the code
using a compiler that was installed with Visual Studio, and Visual Studio as a debugger for the built binary that is produce through the Windows CLI.


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

![Cmd Properties](/assets/software-renderer/lesson-1/lesson-1.0-cmd-properties.png)


### The Project Setup
We will be setting up a project folder(s) for each tutorial in order have individualized pieces that we will be building upon each lesson. I usually have a particular place
on my hard drive that I stored all of my code. Just pick a spot on your hard drive to store the source code for these projects. In order to maintain consistency throughout
the entire project, I recommend setting up each lesson's folder hierarchy as the following:

``` plain
-> SoftwareRenderer 		(main folder)
--> lesson 1 				(sub folder 1 of main folder)
----> win32-example			(sub folder for lesson 1.0, potentially more lessons 1.x)
------> code 				(sub solder of sub folder 1.0)
--------> build.bat 		(build batch script)
--------> win32_hp.c 		(c source code file)
--> lesson 2 			...
```

Next, let's just put a few lines of code inside of the "*build.bat*" file that will allow us to build our C source code. Place the following code inside of the *build.bat* file

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

![Project Folder Strucuture](/assets/software-renderer/lesson-1/lesson-1.0-folder-structure.png)


### Windows API (WinAPI or Win32)
[Win32][win32] or any of the other names the Windows API ([Application Programming Interface][api-def]) may have is the platform layer that we are going to be working with for this
tutorial. We will attempt to limit the amount of C standard library calls that we are going to make in hopes of eventually replace any C standard library usage entirely later
on down the road. There are a ton of different components to the Win32 API, so whenever we start using a new .lib file for linking I will make a section of the tutorial dedicated to
updating the .bat build file with the proper linking static file and expliciting stating what function calls we will be using are defined in the new library we will be linking with.


### Windows API Handles and Objects
In computer programming, handles are an abstract reference to a [resource][handles-wiki]. In Windows API handles are treated as [opaque types][opaque-types], meaning that the data
structures members are not publicly accessible; additionallty, handles can be thought of as a number that Windows uses for internal reference to an object. There are several different
kinds of defined Windows API [handles and types][win32-types]. Whenever we introduce a new data type, I will write a short section describing what that data type is.

Windows API Objects are the defined data structures that have a particular interface that remain consistent to ensure compatiability across system updates.


### Windows API WinMain
In Windows API, the standard graphical user interface application entry point function is named ["WinMain"][winmain]
``` c
int WINAPI
WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow)
{
	return 0;
}
```

* **CALLBACK**, **WINAPI**, and **APIENTRY** are all used to define functions with the __stdcall calling convention. Most functions in the Windows API are declared using **WINAPI**.
* **WINAPI**, is the [calling convention][calling-convention] for system functions. A calling convention is an implementation-level (low-level) scheme for how subroutines receive paramaters
from their caller and how they return a result. This type is defined in the WinDef.h as follows:
``` c
#define WINAPI __stdcall
```

* Parameter: **hInstance**, a handle to the current instance of the application.
	* Type: **HINSTANCE**, is a handle to an instance - the base address of the module in memory. This type is declared in WinDef.h as follows:
	``` c
	typedef HANDLE HINSTANCE;
	```
		* Type: **HANDLE**, is a handle to an object. This type is declared in WinNT.h as follows:
		``` c
		typedef PVOID HANDLE;
		```
		* Type: **PVOID**, is a pointer to any type or a void pointer. This type is declared in WinNT.h as follows:
		``` c
		typedef voido *PVOID;
		```

* Parameter: **hPrevInstance**, a handle to the previous instance of the application. This parameter is always NULL.
	* Type: **HINSTANCE**

* Paramter: **lpCmdLine**, the command line for the application, excluding the program name.
	* Type: **LPSTR**, is a pointer to a null-terminated string of 8-bit Windows (ANSI) characters. This type is declared in WinNT.h as follows:
	``` c
	typedef CHAR *LPSTR;
	```

* Parameter: **nCmdShow**, controls how the window is to be shown.
	* Type: int
	* Values:
		* 0 - SW_HIDE, hides the window and activates another window.
		* 3 - SW_MAXIMIZE, maximizes the specified window.
		* 6 - SW_MINIMIZE, minimizes the specificed window and activates the next top-level window in the Z order.
		* 9 - SW_RESTORE, activates and displays the window. If the window is minimized or maximized, the system stores it to its original size and position. An application should specify this
			  flag when restoring a minimized window.
		* 5 - SW_SHOW, activates the window and displays it in its current size and position.
		* 3 - SW_SHOWMAXIMIZED, activates the window and displays it as a maximized window.
		* 2 - SW_SHOWMINIMIZED, activates the window and displays it as a minimized window.
		* 7 - SW_SHOWMINNOACTIVE, displays the window as a minimized window. This value is similar to SW_SHOWMINIMIZED, except the window is not activated.
		* 8 - SW_SHOWNA, displays the window in its current size and position. This value is similar to SW_SHOW, except the window is not activated.
		* 4 - SW_SHOWNOACTIVATE, displays a window in its most recent size and position. This value is similar to SW_SHOWNORMAL, except the window is not activated.
		* 1 - SW_SHOWNORMAL, activates and displays a window. If the window is minimized or maximized, the system restores it to its original size and position. An application should specify this
			  flag when displaying the window for the first time.

* Return Type: **int**
	* Value: if the function succeeds, terminating when it receives a [WM_QUIT][wm-quit] message, it should return the exit value contained in that message's wParam parameter. If the funciton terminates before
	  entering the message loop, it should return zero.

* Additional Information:
	* The WinMain function should initialize the application, display its main window, and enter a message retrieval-and-dispatch loop that is the top-level control structure for the remainder of the
	  application's execution. Terminate the message loop when it recieves a WM_QUIT message. At that point, your WinMain should exit the application, returning the value passed in the WM_QUIT message's
 	  wParam parameter. If WM_QUIT was received as a result of calling [PostQuitMessage][post-quit-function], the value of wParam is the value of the PostQuitMessage function's nExitCode parameter.


### Windows API Hello World
Now that we have been introduced to the Windows API entry point, let's start out with creating a basic program to use as an example of our basic file structure and getting use to compiling using the Windows
CLI. Before we begin, try to keep the folder and file structure the same as we discussed in a prior section of this tutorial. Let's start out with creating our build.bat batch file:

``` batch
:: Lesson: 1.0
:: File: build.bat
IF NOT EXIST ..\build MKDIR ..\build
PUSHD ..\build

cl /Od /MTd /Zi /nologo ..\code\win32_main.c /link user32.lib

POPD
```

In the above code we are linking with the user32.lib file, because the below code that uses the function call [MessageBox][messagebox-function]. The particular details of this function are not important,
because we are just using it to get started; however, the actual function definition is in the user32.lib or user32.dll file, so this requires us to link with either the dll or lib file. 

Next, inside of the same folder that the build.bat file above was created we need to create a win32_main.c file:

``` c
// Lesson: 1.0
// File: win32_main.c
#include <windows.h>

int WINAPI
WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow)
{
	MessageBox(NULL, "Hello, World!", "Hello, World", 0);
	return 0;
}
```

After both files have been created, navigate to the folder that contains both files from your CLI and type "build". Below is a screenshot of the output that should be received when building:

![Build Output](/assets/software-renderer/lesson-1/lesson-1.0-build.png)


Once the build has completed successfully, an executable should have been produced in the build directory created by the build script named win32_main or whatever you named the c file. If you
call the executable on the CLI or double click on the executable in file explorer the following should be displayed on your desktop:

![Executable Result](/assets/software-renderer/lesson-1/lesson-1.0-executable-result.png)

If you are having issues setting up or building the project and you have ensured to follow all of the directions above, shoot me an email and we can try to work it out together.


### Windows Windows API Procedure, Messages, and Message Queues
Windows API applications are event-driven, meaning the applications waits for the system to pass input to them. This means the system has the responsibility of passing all input to the various
windows in an application. Each individual window has a function associated with it called a ["window procedure"][winproc] that the system calls whenever it has input for a particular window.
The window procedure processes the input and returns control to the system. The window procedure has a defined [function signature][windprocdefine] that has to be implemented when creating a Window
Procedure. In order words, a window procedure is a function that receives and processes messages sent to a window. The following is the definition for a window procedure or "WNDPROC":

``` c
LRESULT CALLBACK WindowProc
(
	HWND hwnd,
	UINT uMsg,
	WPARAM wParam,
	LPARAM lParam
);
```
* Parameter: **hwnd**, a handle to the window
	* Type: HWND, a handle to a window. This type is declared in WinDef.h as follow:
	``` c
	typedef HANDLE HWND;
	```

* Parameter: **uMsg**, the messages.
	* Type: UINT, an unsigned INT in the range 0 through 4294967295. This type is declared in WinDef.h as follows:
	``` c
	typedef unsigned int UINT;
	```

* Parameter: **wParam**, additional message information. The contents of this parameter depends on the value of the uMsg parameter.
	* Type: **WPARAM**, a message parameter. This type is declared in WinDef.h as follows:
	``` c
	typedef UINT_PTR WPARAM;
	```

* Parameter: **lParam**, additional message information. The contents of this parameter depends on the value of the uMsg parameter.
	* Type: **LPARAM**, a message parameter. This type is declared in WinDef.h as follows:
	``` c
	typedef LONG_PTR LPARAM;
	```

* Return Type: **LRESULT** defines a signed result of message processing. This type is declared in WinDef.h as follows:
``` c
typedef LONG_PTR LRESULT;
```
	* **LONG_PTR**, a signed long type for pointer percision. Use when casting a pointer to a long to perform point arithmetic. This type is declared in BaseTsd.h as follows:
	``` c
	#if defined (_WIN64)
		typedef __int64 LONG_PTR;
	#else
		typedef long LONG_PTR;
	#endif
	```
	* Value: the return value is the result of the message processing and depends on the message sent.

The system passes input to a window procedure in the form of a message that can be generated by both the system and the application(s). A message identifier is a named constant
that identifies the purpose of a message. When a window procedure receives a message, it uses a message identifier to determine how to process the message. We will talk about specific
messages later in the tutorial. There are two types of messages, System-Defined Messages and Application-Defined messages. The system sends or posts a system-defined message when it
communicates with an application.  Application-Defined messages, are used created by the application to use by its own windows or to communicate with windows in other processes.

The system can use two different methods for routing messages to a window procedure:
* Posting messages to a first-in, first-out queue called a message queue, a system-defined memory object that temporarily stores messages.
	* With Queue Messages, the system can display any number of windows at a time. The system maintains a single system message queue and one thread-specific message queue for
	  each GUI thread.
	* Whenever the user moves the mouse, clicks the mouse buttons, or types on the keyboard, the device driver for the mouse or keyboard converts the input into messages and places
	  them in the system message queue. The system removes the messages, one at a time, from the system message queue, examines them to determine the destination window, and then
	  post them to the message queue of the thread that created the destination window. A thread's message queue receives all mouse and keyboard messages for the windows created by
	  the thread. The thread removes messages from its queue and directs the system to send them to the appropriate window procedure for processing.
	* The system posts a message to a thread's message queue by filling an [MSG][msg-struct] structure and then copying it to the message queue. A thread can post a message to its
	  own message queue or to the queue of another thread by using the [PostMessage][postmessage] or PostThreadMessage[postthreadmessage] function(s).
	* An application can remove a message from its queue by using the [GetMessage][getmessage] function or the [PeekMessage][peekmessage] function to view a message without removing
	  it from the queue.
	* Messages can also be dispatched to direct the system to send the message to a window procedure by using the function [DispatchMessage][dispatchmessage]
* Sending messages directly to a window procedure.
	* Nonqueued messages are sent immediately to the destination window procedure, bypassing the system message queue and thread message queue.
	* The system typically sends nonqueued messages to notify a window of events that affect it.

The above information was located at [MSDN - About Messages and Message Queues][message-queue].

### Windows API Message Loop, PeekMessage, TranslateMessage, and DispatchMessage


### Windows API Window Class Callback


### Windows API WM_PAINT


### Windows API WM_QUIT


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
[api-def]:								https://en.wikipedia.org/wiki/Application_programming_interface
[win32-handles-obj]:					https://msdn.microsoft.com/en-us/library/windows/desktop/ms724457(v=vs.85).aspx
[handles-wiki]:							https://en.wikipedia.org/wiki/Handle_(computing)
[opaque-types]:							https://en.wikipedia.org/wiki/Opaque_data_type
[win32-types]:							https://docs.microsoft.com/en-us/windows/desktop/winprog/windows-data-types
[winmain]:								https://msdn.microsoft.com/en-us/library/windows/desktop/ms633559(v=vs.85).aspx
[calling-convention]:					https://en.wikipedia.org/wiki/Calling_convention
[wm-quit]:								https://docs.microsoft.com/en-us/windows/desktop/winmsg/wm-quit
[post-quit-function]:					https://msdn.microsoft.com/en-us/library/windows/desktop/ms644945(v=vs.85).aspx
[messagebox-function]:					https://docs.microsoft.com/en-us/windows/desktop/api/winuser/nf-winuser-messagebox
[message-queue]:						https://docs.microsoft.com/en-us/windows/desktop/winmsg/about-messages-and-message-queues
[message-loop]:							https://docs.microsoft.com/en-us/windows/desktop/winmsg/using-messages-and-message-queues#creating_loop
[winproc]:								https://docs.microsoft.com/en-us/windows/desktop/winmsg/window-procedures
[winprocdefine]:						https://msdn.microsoft.com/en-us/library/ms633573(v=VS.85).aspx
[win-messages]:							https://wiki.winehq.org/List_Of_Windows_Messages
[msg-struct]:							https://msdn.microsoft.com/en-us/library/ms644958(v=VS.85).aspx
[postmessage]:							https://msdn.microsoft.com/en-us/library/ms644944(v=VS.85).aspx
[postthreadmessage]:					https://msdn.microsoft.com/en-us/library/ms644946(v=VS.85).aspx
[getmessage]:							https://msdn.microsoft.com/en-us/library/ms644936(v=VS.85).aspx
[peekmessage]:							https://msdn.microsoft.com/en-us/library/ms644943(v=vs.85).aspx
[dispatchmessage]:						https://msdn.microsoft.com/en-us/library/ms644934(v=VS.85).aspx
