output "bastion_public_ip" {
  value = aws_instance.teleport_bastion.public_ip
}

output "bastion_ssh_command" {
  value = "ssh ubuntu@${aws_instance.teleport_bastion.public_ip}"
}