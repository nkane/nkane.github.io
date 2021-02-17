---
layout: post
Title: "Win32 Software Renderer Lesson 1: Getting Started"
date: 2018-08-12
categories: blog gamedev gaming graphics programming
visible: 0 
---
Computer graphics programming has always been an interest of mine; however, I would consider the barrier to entry in to the world of computer graphics high.
As a prerequisite in to computer graphics, it is assumed that the individual seeking to study the topic already has a large foundation of knowledge, inclusive of
an intuitive understanding of higher level mathematics and at least a bit of lower level computer programming knowledge (i.e., "lower level" - meaning
understanding how the code that is written is used by the particular set of computer hardware that the individual is working with). Although certain people would
argue that you can program graphics without the having a lower level understanding of the computer programming, I will not be using a higher level language in 
this series. It is not my goal with this series to convince anyone not use a higher level programming language for computer graphics. Instead, I would like to
explore my own particular interest using a programming language and tool set that I am comfortable with.


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
the same version I am using you should be up and running by the end of this article. You will need to make sure to install the C/C++ development environments whenever
options are listed during the installation, and it would not hurt to have the Windows 10 SDK installed as well. Even though Visual Studio provides a text editor, and a
bunch of other features that I do not use. I typically use the text editor program called [Vim][vim] to edit my source code files, the Windows CLI to compile the code
using a compiler that was installed with Visual Studio, and Visual Studio as a debugger for the built binary that is produce through the Windows CLI.


### Microsoft Visual C/C++ (MSVC) and cl.exe
After Visual Studio has been installed with the C/C++ packages, [Microsoft Visual C++][msvc] (MSVC) with all of the libraries and tools will now be accessible for usage.
In particular, we need to set up our Windows CLI to be able to use all of these new tools that were installed with Visual Studio / MSVC. We need to be able to execute
the [Microsoft C/C++ compiler][cl] (cl.exe). In order to make our Window's CLI a Win32 C development CLI environment, we are going to be setup a few batch script files
to run when the Windows shortcut to the CLI is executed. In other words, we are going to be passing in command line arguments to the Windows CLI program (cmd.exe).


### Batch Files (.bat)
[Batch files][bat] are script files for Windows. These script files contain a series of commands to be executed by the CLI. We will not be exploring deeply in to batch
file scripting, so just understanding what we are trying to accomplish and how we use the script files to assist us is the only requirement.


### Setting Up Windows CLI to Build With MSVC
Finally, we get to setup our Windows CLI to be able to use the Microsoft C/C++ compiler; however, before we get started with setting up our CLI to use these tools I wanted
to take a moment to reiterate the following, if you are using a different version of Visual Studio / MSVC it is possible the location, naming conventions, or existence of
the scripts that will be referenced in the next section have changed based on past packaging changes that Microsoft has done. Just to be explicit about what I am referring
to, in the past the location of a file named ["vcvarsall.bat"][vcvarsall] has changed within the last few versions of Visual Studio. Now that we have that cleared up, let's
start setting up our basic batch file that will be executed on our shortcut to our Windows CLI.

First, we need to find a batch file script named ["vsdevcmd.bat"][vsdevcmd] that is shipped with the installation of Visual Studio / MSVC. For the installation of Visual
Studio that I am using, the file is located at *"C:\Program Files (x86)\Microsoft Visual Studio\2017\Community\Common7\Tools\VsDevCmd.bat"*. Next, pick a spot on your hard
drive to store the batch file, typically I like to store my file under my users directory in Windows (*C:\Users\\{username}*) and name it *"win32_shell.bat"* or whatever else that
you would prefer. Once that batch file has been created, we should have the following inside:

``` bat
:: win32_shell.bat
CALL "C:\Program Files (x86)\Microsoft Visual Studio\2017\Community\Common7\Tools\VsDevCmd.bat"
```

Just to be explicit about why we call this batch file that is shipped with Visual Studio's, the "vsdevcmd.bat" file sets up our CLI instance to be able to use the Microsoft
C/C++ compiler and other development tools. Great! Now, we need to hook up our shortcut to be able to execute our batch file whenever we click on our shortcut icon of the
Windows CLI. By right clicking and selecting the properties of the icon, a field named "Target" under the "Shortcut" tab should be visible. The "Target" field should have
a text box as to the right of it that is filled with the following or similar information: "%windir%\system32\cmd.exe". This basically just tells the shortcut where the
actual executable of "cmd.exe" is located. In addition to the location of the "cmd.exe" executable, we are going to want to pass in a CLI argument that will allow us to
have our new batch file executable on start up of the "cmd.exe" program. The "/K" flag for the executable "cmd.exe" states that it "carries out the command specified by
a string but remains". In other words, it will execute on the CLI whatever is passed in quotes after the /K flag. We are going pass in the location of our batch file in
order to have that executed after the CLI has been loaded that way our CLI instance will have all of the Microsoft Visual Studio tooling available to us via the CLI. Here
is an example of what our "Target" field should look with the CLI argument passed to it: *%windir%\system32\cmd.exe /K "C:\Users\\{user}\win32_shell.bat"*. Just for a frame
of reference, this is exactly what my "Target" field is set to: *%windir%\system32\cmd.exe /K "C:\Users\nkane\win32_shell.bat"*.

![Cmd Properties](/assets/software-renderer/lesson-1/lesson-1.0-cmd-properties.png)


### The Project Setup
We will be setting up a project folder for each tutorial in order have individualized pieces that we will be building upon each lesson. I usually have a particular place
on my hard drive that I stored all of my code. Just pick a spot on your hard drive to store the source code for these projects. In order to maintain consistency throughout
the entire project, I recommend setting up each lesson's folder hierarchy as the following:

``` plain
-> SoftwareRenderer		(main folder)
--> lesson 1			(sub folder 1 of main folder)
----> win32-example		(sub folder for lesson 1.0, potentially more lessons 1.x)
------> code			(sub solder of sub folder 1.0)
--------> build.bat 		(build batch script)
--------> win32_main.c 		(c source code file)
--> lesson 2			...
```

Next, let's just put a few lines of code inside of the "*build.bat*" file that will allow us to build our C source code. Place the following code inside of the *build.bat* file

``` bat
:: build.bat
IF NOT EXIST ..\build MKDIR ..\build
PUSHD ..\build
cl /Od /MTd /Zi /nologo ..\code\win32_main.c /link user32.lib
POPD
```

The above batch file code will create a directory named "build" one relative directory back from the "code" directory, it will then change CLI's current directory to the "build"
directory, build the C source code inside of the "build" directory using the Microsoft C/C++ compiler (cl.exe), and go back to the "code" directory. If you are wondering
what all of those symbols are  on the "cl" line, those are [compiler options][cl-options] or arguments passed into the cl.exe. The /Od flag disables any compiler optimizations,
the /MTd flag creates a multithreaded executable file using [LIBCMTD.lib][libcmtd] which is a debugging version of the multithreaded standard C library, and .lib files are
[static libraries][libvsdll], the /Zi flag generates complete debugging information, the /nologo ignores a text logo and compiler information that is produced by the compiler,
and the /link option allows use to pass options to the [linker][linker] options that we use to pass in the static libraries that we need to link with. If you are not familiar
with the process of linking, it is a part of the executable compilation process that takes all of the ["object files"][objectfiles] and combines them into a single executable
file, library, or another "object file".

![Project Folder Strucuture](/assets/software-renderer/lesson-1/lesson-1.0-folder-structure.png)


### Windows API (WinAPI or Win32)
[Win32][win32] or any of the other names the Windows API ([Application Programming Interface][api-def]) may have is the platform layer that we are going to be working with for this
tutorial. We will attempt to limit the amount of C standard library calls that we are going to make in hopes of eventually replace any C standard library usage entirely later
on down the road. There are a ton of different components to the Win32 API, so whenever we start using a new .lib file for linking I will make a section of the tutorial dedicated to
updating the .bat build file with the proper linking static file and explicitly stating what function calls we will be using are defined in the new library we will be linking with.


### Windows API Handles and Objects
In computer programming, handles are an abstract reference to a [resource][handles-wiki]. In Windows API handles are treated as [opaque types][opaque-types], meaning that the data
structures members are not publicly accessible; additionally, handles can be thought of as a number that Windows uses for internal reference to an object. There are several different
kinds of defined Windows API [handles and types][win32-types]. Whenever we introduce a new data type, I will write a short section describing what that data type is.

Windows API Objects are the defined data structures that have a particular interface that remain consistent to ensure compatibility across system updates.


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

* Parameter: **lpCmdLine**, the command line for the application, excluding the program name.
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
	* Value: if the function succeeds, terminating when it receives a [WM_QUIT][wm-quit] message, it should return the exit value contained in that message's wParam parameter. If the function terminates before
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

![Hello World](/assets/software-renderer/lesson-1/lesson-1.0-hello-world.png)

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
	* **LONG_PTR**, a signed long type for pointer precision. Use when casting a pointer to a long to perform point arithmetic. This type is declared in BaseTsd.h as follows:
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
	* With Queue Messages, the system can display any number of windows at a time. The system maintains a single system message queue and one [thread][thread-wiki]-specific message queue for
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


A Win32 GUI application must remove and process messages posted to the message queue of its threads. For a single-threaded application, WinMain is typically has a message loop to
remove, process, and send messages to the appropriate window procedures for processing. In the next section, we will discuss the message loop in further detail.

The above information was located at [MSDN - About Messages and Message Queues][message-queue].


### Windows API Message Loop, PeekMessage, TranslateMessage, and DispatchMessage
A message queue is not automatically created for each thread in a Windows API program until the program registers and creates an instance of a window (the process of registering and creating
a window will be discussed in the next section). As discussed in the above text, the message loop retrieves messages from the thread's message queue and dispatches them to the appropriate
window procedures. The function [GetMessage][getmessage] or [PeekMessage][peekmessage] can be used in conjunction with a looping statement in order to pull or view messages from a particular
thread's message queue. Here are the definitions for the functions GetMessage and PeekMessage:

``` c
BOOL WINAPI GetMessage
(
	LPMSG lpMsg,
	HWND  hwnd,
	UINT  wMsgFilterMin,
	UINT  wMsgFilterMax
);
```
* Parameter: **lpMsg** [out]
	* Type: **LPMSG**, a pointer to a MSG structure that receives message information from the thread's message queue.

* Parameter: **hWnd** [in, optional]
	* Type: **HWND**

* Parameter: **wMsgFilterMinx**, [in]
	* Type: **UINT**

* Parameter: **wMsgFilterMax**, [in]
	* Type: **UINT**

* Return Type: **BOOL**
	* Value: If the function retrieves a message other than [WM_QUIT][wm-quit], the return value is nonzero. If the function retrieves the WM_QUIT message, the return value is zero. If there
	  is an error, the return value is -1. To get extended error information the function [GetLastError][getlasterror] can be called.

``` c
BOOL WINAPI PeekMessage
(
	LPMSG lpMsg,
	HWND  hWnd,
	UINT  wMsgFilterMin,
    UINT  wMsgFilterMax,
    UINT  wRemoveMsg
);
```
* Parameter: **lpMsg** [out]
	* Type: **LPMSG**, a pointer to a MSG structure that receives message information from the thread's message queue.

* Parameter: **hWnd** [in, optional]
	* Type: **HWND**, a handle to the window whose messages are to be retrieved. The window must be belong to the current thread.
	* Additional Information:
		* If hWnd is NULL, PeekMessages retrieves messages for any window that belongs to the current thread, and any messages on the current thread's message queue whose
	  	  hWnd value is NULL; therefore, if hWnd is NULL, both window messages and thread messages are processed.
		* If hWnd is -1, PeekMessage retrieves only messages on the current thread's message queue whose hWnd value is NULL.

* Parameter: **wMsgFilterMin** [in]
	* Type: **UINT**, the value of the first message in the range of messages to be examined.

* Parameter: **wMsgFilterMax** [in]
	* Type: **UINT**, the value of the last message in the range of messages to be examined.

* Parameter: **wRemoveMsg** [in]
	* Type: **UINT**, specifics how messages are to be handled. This parameter can be one or more of the following values:
		* 0x0000 - PM_NOREMOVE, messages are not removed from the queue after processing by PeekMessage.
		* 0x0001 - PM_REMOVE, 	messages are removed from the queue after processing by PeekMessage.
		* 0x0002 - PM_NOTIELD,	Prevents the system from releasing any thread that is waiting for the caller to go idle.

* Return Type: **BOOL**
	* Value: If a message is available, then return value is nonzero. If no messages are available, the return value is zero. 

Once we have received a message off the message queue, we need to process this message by calling two different functions - [TranslateMessage][translatemessage] and
[DispatchMessage][dispatchmessage]. Here are the definitions for both functions:

``` c
BOOL WINAPI TranslateMessage
(
	const MSG *lpMsg
);
```
* Parameter: **lpMsg**, a pointer to a structure that contains information retrieved from the calling thread's message queue.
	* Type: **MSG**

* Return Type: **BOOL**
	* Value: If the message is translated (that is, a character message is posted to the thread's message queue), the return value is nonzero. If the message is not
	  translated (that is, a character message is not posted to the thread's message queue), the return value is zero.

``` c
LRESULT WINAPI DispatchMessage
(
	const MSG *lpMsg
);
```
* Parameter: **lpMsg**, a pointer to a structure that contains the message.
	* Type: **MSG**

* Return Type: **LRESULT**
	* Value: The return values specifies the value retuned by the window procedure. Although its meaning depends on the message being dispatched, the return value
	  generally is ignored.

Before we can show examples of how to set up a message loop, we need to discuss how to create a window class structure, register it, and create a window with it's own
message queue. The message loop is typically part of the WinMain function that continuously attempts to pull messages off the message queue after a window has been created.


### Windows API Creating a WNDCLASS, Registering a WNDCLASS, and Processing Messages (WNDPROC)
A Win32 Application that would like to display a GUI window needs to go through the process of filling in a data structure called a [WNDCLASS][wndclass], registering the data structure
by calling the function [RegisterClass][registerclass], and creating the window by calling the function [CreateWindow][createwindow]. Here are the definitions for the data structure
and the functions:

``` c
typedef struct tagWNDCLASS
{
	UINT			style;
	WNDPROC			lpfnWndProc;
	int				cbClsExtra;
	int				cbWndExtra;
	HINSTANCE		hInstance;
	HICON			hIcon;
	HCURSOR			hCursor;
	HBRUSH			hbrBackground;
	LPCTSTR			lpszMenuName;
	LPCTSTR			lpszClassName;
} WNDCLASS, *PWNDCLASS;
```
* Members:
	* Field: **style**, the class style(s).
	* Type: **UINT**

	* Field: **lpfnWndProc**, a pointer to the window procedure.
	* Type: **WNDPROC**

	* Field: **cbClsExtra**, the number of extra bytes to allocate following the window-class structure.
	* Type: **int**

	* Field: **cbWndExtra**, the number of extra bytes to allocate following the window instance.
	* Type: **int**

	* Field: **hInstance**, a handle to the instance that contains the window procedure for the class.
	* Type: **HINSTANCE**

	* Field: **hIcon**, a handle to the class icon.
	* Type: **HICON**

	* Field: **hCursor**, a handle to the class cursor.
	* Type: **HCURSOR**

	* Field: **hbrBackground**, a handle to the class background brush.
	* Type: **HBRUSH**

	* Field: **lpszMenuName**, the resource name of the class menu.
	* Type: **LPCTSTR**

	* Field: **lpszClassName**, a pointer to a null-terminated string or is an atom.
	* Type: **LPCTSTR**

``` c
ATOM WINAPI RegisterClass
(
	const WNDCLASS *lpWndClass
);

```
* Parameter: **lpWndClass** [in], a pointer to a WNDCLASS structure filled with the appropriate class attributes before passing to the function.
	* Type: const WNDCLASS *

* Return Type: **ATOM**
	* Value: If the function succeeds, the return value is a class atom that uniquely identifies the class being registered. If the function fails,
	  the return value is zero.

``` c
HWND WINAPI CreateWindow
(
	LPCTSTR 	lpClassName,
	LPCTSTR 	lpWindowName,
	DWORD 		dwStyle,
	int			x,
	int			y,
	int			nWidth,
	int 		nHeight,
	HWND		hWndParent,
	HMENU		hMenu,
	HINSTANCE	hInstance,
	LPVOID		lpParam
);
```
* Parameter: **lpClassName** [in, optional], a null-terminated string or a class atom created by a previous call to the RegisterClass function. The atom
  must be in the low-order word of lpClassName; the high-order word must be zero. If lpClassName is a string, it specifies the window class name. The name
  can be any name registered with the RegisterClass function, provided that the module that registers the class is the module that creates the window.
	* Type: **LPCTSTR**

* Parameter: **lpWindowName** [in, optional], the window name.
	* Type: **LPCTSTR**

* Parameter: **dwStyle** [in]
	* Type: **DWORD**

* Parameter: **x** [in], the initial horizontal position of the window.
	* Type: **int**

* Parameter: **y** [in], the initial vertical position of the window.
	* Type: **int**

* Parameter: **nWidth** [in], the width in device units of the window.
	* Type: **int**

* Parameter: **nHeight** [in], the height in device units of the window.
	* Type: **int**

* Parameter: **hWndParent** [in, optional], a handle to the parent or owner window of the window being created.
	* Type: **HWND**

* Parameter: **hMenu** [in, optional], a handle to a menu.
	* Type: **HMENU**

* Parameter: **hInstance** [in, optional], a handle to the instance of the module to be associated with the window.
	* Type: **HINSTANCE**

* Parameter: **lpParam** [in, optional], a pointer to a value to be passed to the window through the [CREATESTRUCTURE][createstructure]
	* Type: **LPVOID**

* Return Type: **HWND**
	Value: If the function succeeds, the return value is a handle to the new window. If the function fails, the return value is NULL.

Finally, let's start putting the pieces of this puzzle together with an example of how to properly fill in a WNDCLASS, register the window class, create a window,
and start polling messages from the window's thread message queue. Here is an example of how to get a simple window running with Windows API (also, make sure to
keep the file structure the same as the previous example):

``` batch
:: Lesson: 1.1
:: File:   build.bat
IF NOT EXIST ..\build MKDIR ..\build
PUSHD ..\build

cl /Od /MTd /Zi /nologo ..\code\win32_main.c /link user32.lib

POPD
```

``` c
// Lesson: 1.1
// File: win32_main.c
#include <windows.h>
#include <stdint.h>

#define global_variable	static

typedef int8_t		int8;
typedef int16_t		int16;
typedef int32_t		int32;
typedef int64_t		int64;

typedef uint8_t		uint8;
typedef uint16_t	uint16;
typedef uint32_t	uint32;
typedef uint64_t	uint64;

global_variable uint8 GlobalRunning;
global_variable	HWND  GlobalWindowHandle;

LRESULT CALLBACK
Win32MainWindowCallback(HWND windowHandle, UINT message, WPARAM wParam, LPARAM lParam)
{
	LRESULT result = 0;
	switch (message)
	{
		case WM_CLOSE:
		{
			GlobalRunning = 0;
		} break;
		case WM_ACTIVATEAPP:
		{
			OutputDebugString("WM_ACTIVEAPP\n");
		} break;
		case WM_PAINT:
		{
			PAINTSTRUCT paintStruct;
			HDC deviceContext = BeginPaint(windowHandle, &paintStruct);
			EndPaint(windowHandle, &paintStruct);
		} break;
		default:
		{
			result = DefWindowProcA(windowHandle, message, wParam, lParam);
		} break;
	}
	return result;
}

int WINAPI
WinMain(HINSTANCE handleInstance, HINSTANCE handlePreviousInstance, LPSTR longPointerCommandLine, int numberCommandShow)
{
	WNDCLASSA windowClass = { 0 };
	windowClass.style = (CS_HREDRAW | CS_VREDRAW | CS_OWNDC);
	windowClass.lpfnWndProc	= Win32MainWindowCallback;
	windowClass.hInstance = handleInstance;
	windowClass.hCursor = LoadCursor(NULL, IDC_ARROW);
	windowClass.lpszClassName = "WindowClass";
	if (RegisterClassA(&windowClass))
	{
		GlobalWindowHandle = CreateWindowExA(0, windowClass.lpszClassName, "Software Renderer - Lesson 1.1", WS_OVERLAPPEDWINDOW | WS_VISIBLE, CW_USEDEFAULT, CW_USEDEFAULT, 800, 600, 0, 0, handleInstance, 0);
		if (GlobalWindowHandle)
		{
			GlobalRunning = 1;
			while (GlobalRunning)
			{
				MSG message;
				while (PeekMessage(&message, 0, 0, 0, PM_REMOVE))
				{
					if (message.message = WM_QUIT)
					{
						GlobalRunning = 0;
					}
					TranslateMessage(&message);
					DispatchMessage(&message);
				}
			}
		}
	}
	return 0;
}
```

In the above example, *WinMain* in the entry point of our application and the function *Win32MainWindowCallback* is the [callback][callback] function that will be using to process queue message for our window.
Instead of using a WNDCLASS structure, we are using a WNDCLASSA structure which is just the [ANSI][ansi] version of the structure WNDCLASS. Next, we need to populate the necessary fields for the WNDCLASSA structure
with the appropriate data then we register the WNDCLASS by calling the function *RegisterClassA* function (again, this is just the ANSI version of the function *RegisterClass*). Once the WNDCLASS structure has been
successfully registered, we can proceed to attempt to create a window by calling the function *CreateWindowExA*. The last order of business, is to set up our message loop to process in coming window event messages
using the function *PeekMessage*, *TranslateMessage*, and *DispatchMessage* in conjunction. In the above code example you will probably notice a control switch statement within the callback function, the values that
we are switching on is the actual message that has been pulled off our window message queue and "dispatched" (e.g., WM_CLOSE, WM_ACTIVATEAPP, and WM_PAINT). In the next session, we will discuss a few important messages
that will need to know.

After you get the above code example up and running, you should see the following window when the executable is launched:

![Hello Window](/assets/software-renderer/lesson-1/lesson-1.1-hello-window.png)

Now, in order to get an understanding on this process works I usually find it helpful to step through the code using visual studio. Here is an image of how I build and then launch Visual Studio with the debugger
attached to the executable that we previously produced:

![Build](/assets/software-renderer/lesson-1/lesson-1.1-build.png)

Because we previously setup our Windows CLI to be a Windows C development friendly environment, we should be able to execute the command ["devenv"][devenv] which will launch Visual Studios and attempt to attach any
executable passed to it to the debugger. In the above example, I have added a switch case for the [WM_ACTIVATEAPP][wm_activateapp] message that is sent to a window's message queue when an application becomes "active"
or has currently been selected to be used by the user and the callback function that processes the main window's messages handles this message by calling another function [OutputDebugString][outputdebugstring]. The
reason of this was to show you a way to get Visual Studio console output for debugging purposes. Here is what the output looks like in Visual Studio:

![Debug Message](/assets/software-renderer/lesson-1/lesson-1.1-debug-message.png)


### Windows API Message WM_PAINT and WM_CLOSE
Finally, let's finish up this tutorial demystifying the two messages [WM_PAINT][wm_paint] and [WM_CLOSE][wm_close]. The WM_PAINT message that is generated by the system and should not be sent by an application.
The reason why we process this message by calling the function [BeginPaint][beginpaint] and [EndPaint][endpaint] is because the sets the clipping region of the device context to exclude any area outside the update
region and "validates" the rectangle context display area. Since Windows generates the WM_PAINT message we need to basically just tell Window's that the update region is empty by calling BeginPaint and EndPaint. If
you exclude this process, Windows will continuously generate WM_PAINT messages attempting to update the client region essentially halting the process from handling other requesting within a reasonable amount of time.

The WM_CLOSE is produced whenever the user attempts to close a window. There are a variety of different ways to handle closing out and cleaning up a process that are documented [here][close-window]; however, we are
just using one window for our software renderer, so we don't have to worry about child windows or any resources potentially left over from menus. This message just notifies us that the user would like to exit the
application, we accomplish that by in our example in the previous section by setting a global variable to a value that will exit out of a looping statement.


### Final Words
There is a high probability that I missed out on details, potentially have inaccurate information, or typos / grammatical errors. If you find this tutorial hard to comprehend or anything in the previous list,
please shoot me an email that way I can fix it. Thank you for reading!

The source code for lesson one can be found [here][nkane-src-lesson-1].




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
[thread-wiki]:							https://en.wikipedia.org/wiki/Thread_(computing)
[wm_quit]:								https://docs.microsoft.com/en-us/windows/desktop/winmsg/wm-quit
[getlasterror]:							https://msdn.microsoft.com/en-us/library/ms679360(v=vs.85).aspx
[translatemessage]:						https://msdn.microsoft.com/en-us/library/ms644955(v=VS.85).aspx
[dispatchmessage]:						https://msdn.microsoft.com/en-us/library/ms644934(v=VS.85).aspx
[windowclass-about]:					https://docs.microsoft.com/en-us/windows/desktop/winmsg/about-window-classes
[wndclass]:								https://msdn.microsoft.com/en-us/library/windows/desktop/ms633576(v=vs.85).aspx
[registerclass]:						https://msdn.microsoft.com/en-us/library/windows/desktop/ms633586(v=vs.85).aspx
[createwindow]:							https://msdn.microsoft.com/en-us/library/windows/desktop/ms632679(v=vs.85).aspx
[createstructure]:						https://msdn.microsoft.com/en-us/library/windows/desktop/ms632603(v=vs.85).aspx
[callback]:								https://en.wikipedia.org/wiki/Callback_(computer_programming)
[ansi]:									https://www.ansi.org/
[devenv]:								https://msdn.microsoft.com/en-us/library/xee0c8y7.aspx
[wm_activateapp]:						https://docs.microsoft.com/en-us/windows/desktop/winmsg/wm-activateapp
[outputdebugstring]:					https://msdn.microsoft.com/en-us/library/windows/desktop/aa363362(v=vs.85).aspx
[wm_paint]:								https://docs.microsoft.com/en-us/windows/desktop/gdi/wm-paint
[wm_close]:								https://docs.microsoft.com/en-us/windows/desktop/winmsg/wm-close
[beginpaint]:							https://docs.microsoft.com/en-us/windows/desktop/api/winuser/nf-winuser-beginpaint
[endpaint]:								https://docs.microsoft.com/en-us/windows/desktop/api/winuser/nf-winuser-endpaint
[close-window]: 						https://docs.microsoft.com/en-us/windows/desktop/learnwin32/closing-the-window
[nkane-src-lesson-1]:					https://github.com/nkane/SoftwareRenderer/tree/master/lesson-1
