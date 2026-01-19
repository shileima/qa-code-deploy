#!/usr/bin/env bash
echo "******************** start post deploy **********************"
set -e
export PATH=$PATH:~/.nvm/versions/node/v14.15.1/bin
echo "$(date +"%T")"

# 全局安装air-cli
npm i -g @mtfe/nest-cli --registry=http://r.npm.sankuai.com

# 配置git ssh
echo "git ssh配置开始"
# ssh源文件路径
source_directory="ssh/"
# ssh文件目标路径
target_directory="/home/sankuai/.ssh"
if [ ! -d "$target_directory" ]; then
  echo "ssh文件目标路径不存在，创建目标路径"
  mkdir -p "$target_directory"
fi
# 使用cp命令拷贝ssh文件
cp "$source_directory"* "$target_directory"
chmod 600  "$target_directory/id_rsa"
chmod 0644  "$target_directory/id_rsa.pub"
git config --global user.name 'git_bfe_stash'
git config --global user.email 'git_bfe_stash@meituan.com'
# 列出ssh目标文件夹中的文件
ls -l "$target_directory" | awk '{k=0;for(i=0;i<=8;i++)k+=((substr($1,i+2,1)~/[rwx]/)*2^(8-i));if(k)printf("%0o ",k);print}'
echo "git ssh配置完成"


# 该脚本将由plus自行登录服务器执行, 届时将不存在$HOME环境变量. 另一方面, 后续其他三方脚本中有依赖$HOME环境变量.
# 因此, 这里必须手动设置临时变量, 否则三方脚本执行时将出错.
export HOME=/home/sankuai

# 为当前shell加载nvm
if [ -f ~/.bashrc ]; then
    source ~/.bashrc
else
    source ~/.nvm/nvm.sh
fi

echo "[deploy-env-check] end"



cd /opt/meituan/apps/nest
npx nest-start

echo "$(date +"%T")"
echo "******************** end post deploy **********************"
