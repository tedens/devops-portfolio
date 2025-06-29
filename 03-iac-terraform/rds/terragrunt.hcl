include "root" {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../vpc"]
}


dependency "vpc" {
  config_path = "../vpc"
  skip_outputs = true
}

inputs = {
  vpc_id = dependency.vpc.outputs.vpc_id
  private_subnet_ids = dependency.vpc.outputs.private_subnet_ids

}