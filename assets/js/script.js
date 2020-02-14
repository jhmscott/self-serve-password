$(document).ready(function() {
    //gets server names, descritpions and states
    $.ajax({
        url: '/get-servers',
        method: 'GET',
        success: function(resp) {
            //generate a table with a row for each server
            resp.serverList.forEach(function(server){               
                const newRow            = document.getElementById('server-table').getElementsByTagName('tbody')[0].insertRow();
                const serverName        = newRow.insertCell(0);
                const serverDescription = newRow.insertCell(1);

                serverName.appendChild(document.createTextNode(server.name));
                //if server is online colour code the text green
                serverName.style.color = server.isAlive ? "green" : "red";
                serverDescription.appendChild(document.createTextNode(server.description));
            });
        }
    });

    //set profile picture element 
    $.ajax({
        url: '/profile',
        method: 'GET',
        success: function(resp) {
            document.getElementById("profile-pic").src = resp.photo;
        }
    });

    //respond to whether the password chaneg successed or not
    $('#change-pass').submit(function(e){
        e.preventDefault();
        console.log('Changing Password');
        $.ajax({
            url: '/change-pass',
            method: 'POST',
            data: $(this).serialize(),
            success: function(resp) {
                if (resp.status === 'success') {
                    swal({
                        title: 'Success',
                        text: 'Password Changed!',
                        allowOutsideClick: false
                    }).then(function(){ 
                        //reload page when ok is clicked
                        location.reload();
                    });

                } 
                else if (resp.status === 'fail') {
                    swal({
                        title: 'Failed', 
                        text: resp.message,
                        type: 'error',
                        allowOutsideClick: false
                    }).then(function(){ 
                        //reload page when ok is clicked
                        location.reload();
                    });

                }
            }
        });
    });

    
});