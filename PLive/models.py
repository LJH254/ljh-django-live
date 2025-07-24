from django.db import models


class ChatCalls(models.Model):
    from_csrftoken = models.CharField(verbose_name='CSRF令牌', max_length=50)
    to_csrftoken = models.CharField(verbose_name='CSRF令牌', max_length=50)
    session_uuid = models.CharField(verbose_name='UUID', default='', max_length=50)

    class Meta:
        managed = False
        db_table = 'Pchat_Calls'
