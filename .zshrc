# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
    source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:/usr/local/bin:$PATH

# Path to your oh-my-zsh installation.
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="powerlevel10k/powerlevel10k"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# You can set one of the optional three formats:
# "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# or set a custom format using the strftime function format specifications,
# see 'man strftime' for details.
# HIST_STAMPS="mm/dd/yyyy"
HISTFILE=~/.zsh_history
HISTSIZE=50000      # Increase the number of commands to remember in memory
SAVEHIST=50000      # Increase the number of commands to save in the history file

# Avoid duplicates
setopt HIST_IGNORE_DUPS     # Ignore duplicate commands
setopt HIST_IGNORE_ALL_DUPS # Remove older duplicate commands and keep the most recent
setopt HIST_FIND_NO_DUPS    # Do not display duplicates when searching history
setopt HIST_SAVE_NO_DUPS    # Do not write duplicate commands to the history file
setopt HIST_EXPIRE_DUPS_FIRST # Expire duplicate entries first when trimming history

# Other useful history options
setopt SHARE_HISTORY      # Share history across all zsh sessions
setopt INC_APPEND_HISTORY # Append commands to history file incrementally
setopt EXTENDED_HISTORY   # Save the timestamp of commands in the history file

# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

# Which plugins would you like to load?
# Standard plugins can be found in $ZSH/plugins/
# Custom plugins may be added to $ZSH_CUSTOM/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(
    git
    zsh-autosuggestions
    # zsh-autocomplete
    zsh-syntax-highlighting
    zsh-vi-mode
)

source $ZSH/oh-my-zsh.sh

# User configuration

# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='mvim'
# fi

alias k="kubectl"
alias v="nvim"
alias vim="nvim"
alias fzf="fzf-tmux -p"
alias ls="eza"
alias cat="bat"
knsset() {
    kubectl config set-context --current --namespace=$1
}
knsget() {
  local namespace
  namespace=$(kubectl config view --minify --output 'jsonpath={..namespace}')
  if [[ -z "$namespace" ]]; then
    echo "default"
  else
    echo "$namespace"
  fi
}
kns() {
    ns=$(k get ns | awk 'NR > 1 {print $1}' | sort | fzf --header="Select namespace")
    if [ -n "$ns" ]; then
        kubectl config set-context --current --namespace=$ns
    fi
}
klog() {
    pod=$(kubectl get pods --all-namespaces -o custom-columns=NAME:.metadata.name,NAMESPACE:.metadata.namespace --no-headers | fzf --header="Select a pod to tail logs")
    if [ -z "$pod" ]; then
        echo "No pod selected."
        return
    fi
    namespace=$(echo $pod | awk '{print $2}')
    pod_name=$(echo $pod | awk '{print $1}')
    kubectl logs -f -n $namespace $pod_name | tspin
}
kctx() {
    cluster=$(k config get-contexts | awk 'NR > 1 {print $2}' | sort | uniq | fzf --header="Select cluster to set in kubectl context")
    if [ -n "$cluster" ]; then
        kubectl config use-context $cluster
    fi
}
tcopy() {
    word=$(tmux capture-pane -J -p | tr -s '[:space:]' '\n' | fzf)
    if [ -n "$word" ]; then
        echo "$word" | pbcopy
    fi
}
stargate() {
    cd ~/Desktop/stargate-stuff/stargate
}
dhari() {
    cd ~/Desktop/shuri/dhari
}
requotes() {
    cd ~/Desktop/stargate-stuff/pipelines/use-cases/arcadia-pipelines/deployments/uat/aws/arcadia-main-test-2345/requote365-arcadiamain-test
}
pipelines() {
    cd ~/Desktop/stargate-stuff/pipelines
}
vconfig() {
    nvim ~/.config/nvim
}
zshconfig() {
    nvim ~/.zshrc
}

# Generated for envman. Do not edit.
[ -s "$HOME/.config/envman/load.sh" ] && source "$HOME/.config/envman/load.sh"
export PATH="$HOME/.jenv/bin:$PATH"
eval "$(jenv init -)"

export PATH="$PATH:/Users/kaleb/Library/Application Support/Coursier/bin"
export PATH="$PATH:/Users/kaleb/go/bin"


# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

ZSH_HIGHLIGHT_STYLES[suffix-alias]=fg=#a48eed,underline
ZSH_HIGHLIGHT_STYLES[precommand]=fg=#a48eed,underline
ZSH_HIGHLIGHT_STYLES[arg0]=fg=#a48eed
ZSH_HIGHLIGHT_STYLES[single-quoted-argument]=fg=#61d487
ZSH_HIGHLIGHT_STYLES[double-quoted-argument]=fg=#61d487
[[ -s "/Users/kaleb/.gvm/scripts/gvm" ]] && source "/Users/kaleb/.gvm/scripts/gvm"

# For shuri-sdk
export WHISPER_PASSWORD=engineerservice
export WHISPER_KEY_PATH=/Users/kaleb/Documents/Whisper/localhost.apple.com.key.pem
export WHISPER_CERT_PATH=/Users/kaleb/Documents/Whisper/localhost.apple.com.chain.pem

eval "$(fzf --zsh)"
eval "$(zoxide init --cmd cd zsh)"
export PATH=/opt/homebrew/opt/libpq/bin:$PATH
