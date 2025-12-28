@echo off
REM Download DA.Finance v1.15.0 packages for SDK 2.8.0/2.10.0
REM These packages are compatible with LF version 1.15

set SDK_VERSION=2.10.0
set SDK_LIBS=%APPDATA%\daml\sdk\%SDK_VERSION%\daml-libs

echo Downloading DA.Finance v1.15.0 packages for SDK %SDK_VERSION%...
echo.

curl -L -o "%SDK_LIBS%\daml-finance-interface-account-1.0.0-1.15.dar" "https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Account.V1/1.15.0/daml-finance-interface-account-v1-1.15.0.dar"
echo Downloaded: daml-finance-interface-account

curl -L -o "%SDK_LIBS%\daml-finance-interface-holding-1.0.0-1.15.dar" "https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Holding.V1/1.15.0/daml-finance-interface-holding-v1-1.15.0.dar"
echo Downloaded: daml-finance-interface-holding

curl -L -o "%SDK_LIBS%\daml-finance-interface-settlement-1.0.0-1.15.dar" "https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Settlement.V1/1.15.0/daml-finance-interface-settlement-v1-1.15.0.dar"
echo Downloaded: daml-finance-interface-settlement

curl -L -o "%SDK_LIBS%\daml-finance-interface-types-common-1.0.0-1.15.dar" "https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Types.Common.V1/1.15.0/daml-finance-interface-types-common-v1-1.15.0.dar"
echo Downloaded: daml-finance-interface-types-common

curl -L -o "%SDK_LIBS%\daml-finance-interface-types-token-1.0.0-1.15.dar" "https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Types.Token.V1/1.15.0/daml-finance-interface-types-token-v1-1.15.0.dar"
echo Downloaded: daml-finance-interface-types-token

curl -L -o "%SDK_LIBS%\daml-finance-interface-util-1.0.0-1.15.dar" "https://github.com/digital-asset/daml-finance/releases/download/Daml.Finance.Interface.Util.V1/1.15.0/daml-finance-interface-util-v1-1.15.0.dar"
echo Downloaded: daml-finance-interface-util

echo.
echo All packages downloaded!
echo.
pause

