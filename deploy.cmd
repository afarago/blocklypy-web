cmd /c npm run build

xcopy /Y dist\*.* ..\pyllsp4pub\dist

pushd .
cd ..\pyllsp4pub
git add .
git commit -m "content"
git push
popd