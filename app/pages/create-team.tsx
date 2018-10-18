import { observer } from 'mobx-react';
import * as React from 'react';

import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Head from 'next/head';
import Router from 'next/router';

import { getSignedRequestForUpload, uploadFileUsingSignedPutRequest } from '../lib/api/team-member';
import notify from '../lib/notifier';
import { Store } from '../lib/store';
import withAuth from '../lib/withAuth';

import env from '../lib/env';

import Layout from '../components/layout';

const styleGrid = {
  height: '100%',
};

type MyProps = { store: Store; isTL: boolean };

class CreateTeam extends React.Component<MyProps> {
  public state = {
    newName: '',
    newAvatarUrl: 'https://storage.googleapis.com/async-await/default-user.png?v=1',
    disabled: false,
  };

  public onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { newName } = this.state;

    if (!newName) {
      notify('Team name is required.');
      return;
    }

    const file = document.getElementById('upload-file').files[0];

    try {
      this.setState({ disabled: true });

      const defaultAvatarUrl = 'https://storage.googleapis.com/async-await/default-user.png?v=1';
      const team = await this.props.store.addTeam({
        name: newName,
        avatarUrl: defaultAvatarUrl,
      });

      console.log(`Returned to client: ${team._id}, ${team.name}, ${team.slug}`);

      if (file == null) {
        Router.push(`/team/${team.slug}/settings/team-members`);
        notify('You successfully created Team.<p />Redirecting...');
        return;
      }

      const { BUCKET_FOR_TEAM_AVATARS } = env;
      const bucket = BUCKET_FOR_TEAM_AVATARS;
      const prefix = team.slug;

      const responseFromApiServerForUpload = await getSignedRequestForUpload({
        file,
        prefix,
        bucket,
        acl: 'public-read',
      });
      await uploadFileUsingSignedPutRequest(file, responseFromApiServerForUpload.signedRequest, {
        'Cache-Control': 'max-age=2592000',
      });

      const properAvatarUrl = responseFromApiServerForUpload.url;

      await team.edit({ name: team.name, avatarUrl: properAvatarUrl });

      this.setState({
        newName: '',
        newAvatarUrl: 'https://storage.googleapis.com/async-await/default-user.png?v=1',
      });

      document.getElementById('upload-file').value = '';

      Router.push(`/team/${team.slug}/settings/team-members`);

      notify('You successfully created Team. Redirecting ...');
    } catch (error) {
      console.log(error);
      notify(error);
    } finally {
      this.setState({ disabled: false });
    }
  };

  public previewAvatar = () => {
    const file = document.getElementById('upload-file').files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = e => {
      this.setState({ newAvatarUrl: e.target.result });
    };

    reader.readAsDataURL(file);
  };

  public render() {
    const { newAvatarUrl } = this.state;

    return (
      <Layout {...this.props}>
        <Head>
          <title>Create Team</title>
          <meta name="description" content="Create a new Team" />
        </Head>
        <div style={{ padding: '0px', fontSize: '14px', height: '100%' }}>
          <Grid container style={styleGrid}>
            <Grid item sm={12} xs={12} style={{ padding: '0px 20px' }}>
              <h3>Create team</h3>
              <p />
              <form onSubmit={this.onSubmit}>
                <h4>Team name</h4>
                <TextField
                  value={this.state.newName}
                  label="Type your team's name."
                  helperText="Team name as seen by your team members."
                  onChange={event => {
                    this.setState({ newName: event.target.value });
                  }}
                />
                <p />
                <br />
                <h4 style={{ marginTop: '40px' }}>Team logo (optional)</h4>
                <Avatar
                  src={newAvatarUrl}
                  style={{
                    display: 'inline-flex',
                    verticalAlign: 'middle',
                    marginRight: 20,
                    width: 60,
                    height: 60,
                  }}
                />
                <label htmlFor="upload-file">
                  <Button variant="outlined" color="primary" component="span">
                    Select team logo
                  </Button>
                </label>
                <input
                  accept="image/*"
                  name="upload-file"
                  id="upload-file"
                  type="file"
                  style={{ display: 'none' }}
                  onChange={this.previewAvatar}
                />
                <br />
                <br />
                <br />
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={this.state.disabled}
                >
                  Create new team
                </Button>
              </form>
            </Grid>
          </Grid>
        </div>
      </Layout>
    );
  }
}

export default withAuth((observer(CreateTeam), { teamRequired: false }));
