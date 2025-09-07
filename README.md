# KolekKita

## Initial Git Setup Command

# Create file
echo "# ExampleName" >> "File name"

# Initialize a new Git repository
git init

# Add all files
git add "File name"

# Commit files
git commit -m "Commit message"

# Rename branch to main
git branch -M main

# Add remote repository
git remote add origin https://github.com/MilSimm/KolekKita-Administrator-Website.git

# Push to GitHub
git push -u origin main



## Commit Command

# Add changes
git add .

# Commit changes
git commit -m "Commit message"

# Push changes to GitHub
git push



## Check Command

# Check the current remote URL
# Shows the fetch and push URLs for your remote repository.
git remote -v

# List all local branches
# Highlights the current branch with an asterisk.
git branch

# Check your Git username and email
# Shows the Git identity used for commits.
git config user.name
git config user.email

# Check any uncommitted changes that might be lost after rebase
git status
