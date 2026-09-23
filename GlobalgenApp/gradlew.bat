@rem Gradle Wrapper Script (Windows)
@rem Use this script to run Gradle from the command line on Windows.

@if "%DEBUG%"=="" @echo off
set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar
set JAVACMD=java

%JAVACMD% %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% ^
  -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*

