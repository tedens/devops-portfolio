generate "provider" {
  path = "aws-provider.tf"
  if_exists = "overwrite_terragrunt"
  contents = <<EOF
    provider "aws" {
      region = "us-east-1"
      default_tags {
        tags = {
          Terraform = "True"
        }
      }
    }
    EOF
}

terraform {
  extra_arguments "custom_vars" {
    commands = get_terraform_commands_that_need_vars()
    required_var_files = ["${get_parent_terragrunt_dir()}/common.tfvars"]
  }
}

remote_state {
  backend = "local"
  generate = {
    path      = "remote-state.tf"
    if_exists = "overwrite_terragrunt"
  }
  config = {
    path = "./terraform.tfstate"
  }
}