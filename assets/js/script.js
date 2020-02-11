$(document).ready(function() {
    $.ajax({
        url: '/get-servers',
        method: 'GET',
        success: function(resp) {
            console.log(resp);
            resp.serverList.forEach(function(server){               
                const newRow            = document.getElementById('server-table').getElementsByTagName('tbody')[0].insertRow();
                const serverName        = newRow.insertCell(0);
                const serverDescription = newRow.insertCell(1);

                serverName.appendChild(document.createTextNode(server.name));
                serverName.style.color = server.isAlive ? "green" : "red";
                serverDescription.appendChild(document.createTextNode(server.description));
            });
        }
    });
    $.ajax({
        url: '/profile',
        method: 'GET',
        success: function(resp) {
            console.log(resp.photo);
            document.getElementById("profile-pic").src = resp.photo;
        }
    });

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
                        title: 'Password Changed!',
                        text: 'Password Changed!',
                        allowOutsideClick: false
                    }).then(function(){ 
                        location.reload();
                    });

                } 
                else if (resp.status === 'fail') {
                    swal({
                        title: resp.message, 
                        text: resp.message,
                        type: 'error',
                        allowOutsideClick: false
                    }).then(function(){ 
                        location.reload();
                    });

                }
            }
        });
    });
});